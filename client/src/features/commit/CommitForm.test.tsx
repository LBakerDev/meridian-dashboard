import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Fund } from '../../api/types.ts'
import { makeCommitment, makeFund } from '../../test/factories.ts'
import { deferred, jsonResponse, routeFetch, type FetchCall } from '../../test/http.ts'
import { renderWithProviders } from '../../test/render.tsx'
import { CommitForm } from './CommitForm.tsx'

const northwind = makeFund({ closeDate: '2099-12-15' }) // USD, $250K minimum
const dunmore = makeFund({
  id: 'fund_dunmore_ii',
  name: 'Dunmore Opportunistic Credit Fund II',
  currency: 'EUR',
  closeDate: '2099-01-15',
})

const created = makeCommitment({ id: 'cm_0021', fundId: northwind.id, committed: 300_000, status: 'pending_close' })

function renderForm(fund: Fund = northwind) {
  const onDone = vi.fn()
  const onChangeFund = vi.fn()
  const onCancel = vi.fn()
  const view = renderWithProviders(<CommitForm fund={fund} onDone={onDone} onChangeFund={onChangeFund} onCancel={onCancel} />)
  return { ...view, onDone, onChangeFund, onCancel }
}

const amountInput = () => screen.getByLabelText('Commitment amount')
const termsBox = () => screen.getByRole('checkbox', { name: "I've read and accept the fund terms" })
const submitButton = () => screen.getByRole('button', { name: /^Commit/ })

function posts(fetchMock: ReturnType<typeof routeFetch>) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
}

/** Answers the commit POST with `respond`; any GET (refreshes after success) gets an empty 200. */
function serve(respond: (call: FetchCall) => Response | Promise<Response>) {
  return routeFetch((call) => (call.method === 'POST' ? respond(call) : jsonResponse(200, {})))
}

describe('CommitForm', () => {
  it("shows the fund's terms and confirms the amount on the button", async () => {
    serve(() => jsonResponse(201, created))
    const { user } = renderForm()

    expect(screen.getByRole('heading', { name: northwind.name })).toBeInTheDocument()
    expect(screen.getByText('Target net IRR')).toBeInTheDocument()
    expect(screen.getByText('Minimum $250,000')).toBeInTheDocument()
    expect(submitButton()).toHaveTextContent(/^Commit$/)

    await user.type(amountInput(), '300000')

    expect(amountInput()).toHaveValue('$300,000')
    expect(submitButton()).toHaveTextContent('Commit $300,000')
  })

  it('checks the amount and terms before sending anything', async () => {
    const fetchMock = serve(() => jsonResponse(201, created))
    const { user } = renderForm()

    await user.click(submitButton())

    expect(screen.getByText('Enter a commitment amount.')).toBeInTheDocument()
    expect(screen.getByText('You must acknowledge the fund terms to continue.')).toBeInTheDocument()
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true')

    await user.type(amountInput(), '100000')
    await user.click(submitButton())

    expect(screen.getByText('Minimum commitment for this fund is $250,000.')).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it("states the minimum in the fund's currency", async () => {
    serve(() => jsonResponse(201, created))
    const { user } = renderForm(dunmore)

    expect(screen.getByText('Minimum €250,000')).toBeInTheDocument()

    await user.type(amountInput(), '1000')
    await user.click(submitButton())

    expect(screen.getByText('Minimum commitment for this fund is €250,000.')).toBeInTheDocument()
  })

  it('submits, confirms with a toast, and hands back once done', async () => {
    const fetchMock = serve(() => jsonResponse(201, created))
    const { user, onDone } = renderForm()

    await user.type(amountInput(), '300000')
    await user.click(termsBox())
    await user.click(submitButton())

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    const [path, init] = posts(fetchMock)[0]
    expect(path).toBe(`/api/funds/${northwind.id}/commitments`)
    expect(JSON.parse(String(init?.body))).toEqual({ amount: 300_000, acknowledgedTerms: true })
    expect(await screen.findByText('Commitment submitted')).toBeInTheDocument()
    expect(screen.getByText(`$300K to ${northwind.name}. It's pending until the fund closes.`)).toBeInTheDocument()
  })

  it("shows the server's field errors under the fields, in the fund's currency", async () => {
    serve(() =>
      jsonResponse(400, {
        error: 'Please correct the highlighted fields.',
        fields: { amount: 'Minimum commitment for this fund is $250,000.' },
      }),
    )
    const { user, onDone } = renderForm(dunmore)

    await user.type(amountInput(), '300000')
    await user.click(termsBox())
    await user.click(submitButton())

    expect(await screen.findByText('Minimum commitment for this fund is €250,000.')).toBeInTheDocument()
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('explains a closed fund, keeps what was typed, and offers another fund', async () => {
    serve(() => jsonResponse(409, { error: `${northwind.name} is closed to new commitments.` }))
    const { user, onChangeFund, onDone } = renderForm()

    await user.type(amountInput(), '300000')
    await user.click(termsBox())
    await user.click(submitButton())

    expect(await screen.findByText('This fund has closed')).toBeInTheDocument()
    expect(screen.getByText(`${northwind.name} is closed to new commitments.`)).toBeInTheDocument()
    expect(amountInput()).toHaveValue('$300,000')
    expect(termsBox()).toBeChecked()
    expect(onDone).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Choose another fund' }))
    expect(onChangeFund).toHaveBeenCalledTimes(1)
  })

  it('explains a fund that no longer exists', async () => {
    serve(() => jsonResponse(404, { error: 'No fund with id "fund_northwind_iv"' }))
    const { user } = renderForm()

    await user.type(amountInput(), '300000')
    await user.click(termsBox())
    await user.click(submitButton())

    expect(await screen.findByText('This fund is no longer available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose another fund' })).toBeInTheDocument()
  })

  it('keeps everything after a network failure so it can be sent again', async () => {
    let attempts = 0
    const fetchMock = serve(() => {
      attempts += 1
      if (attempts === 1) throw new TypeError('Failed to fetch')
      return jsonResponse(201, created)
    })
    const { user, onDone } = renderForm()

    await user.type(amountInput(), '300000')
    await user.click(termsBox())
    await user.click(submitButton())

    expect(await screen.findByText("Couldn't reach the server")).toBeInTheDocument()
    expect(amountInput()).toHaveValue('$300,000')

    await user.click(submitButton())

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(posts(fetchMock)).toHaveLength(2)
    expect(screen.queryByText("Couldn't reach the server")).not.toBeInTheDocument()
  })

  it('sends only once while a commit is in flight', async () => {
    const response = deferred<Response>()
    const fetchMock = serve(() => response.promise)
    const { user, onCancel } = renderForm()

    await user.type(amountInput(), '300000')
    await user.click(termsBox())
    await user.click(submitButton())
    // The button is disabled while loading, but Enter in the field still submits the form.
    await user.type(amountInput(), '{Enter}')

    expect(posts(fetchMock)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    response.resolve(jsonResponse(201, created))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled())
    expect(onCancel).not.toHaveBeenCalled()
  })
})
