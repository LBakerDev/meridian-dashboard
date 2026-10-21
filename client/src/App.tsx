import { Route, Routes } from 'react-router'

import { AppLayout } from './app/AppLayout.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PortfolioPage } from './pages/PortfolioPage.tsx'

// One page. The router stays because the commitments table keeps its filter,
// sort and page in the URL, and unknown addresses still need a not-found page.
function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PortfolioPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
