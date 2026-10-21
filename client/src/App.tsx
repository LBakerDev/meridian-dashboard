import { Route, Routes } from 'react-router'

import { AppLayout } from './app/AppLayout.tsx'
import { FundsPage } from './pages/FundsPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PortfolioPage } from './pages/PortfolioPage.tsx'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PortfolioPage />} />
        <Route path="funds" element={<FundsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
