import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import SplashPage from './routes/SplashPage'
import Shop from './routes/Shop'
import Cards from './routes/shops/Cards'
import Inventory from './routes/shops/Inventory'
import Cart from './routes/shops/Cart'
import ShopHome from './routes/shops/ShopHome'
import Card from './routes/shops/Card'
import SearchDrill from './routes/shops/SearchDrill'
import MoxSearch from './routes/shops/MoxSearch'
import AuthCallback from './routes/AuthCallback'
import OwnerDashboard from './routes/owner/OwnerDashboard'
import ManageShop from './routes/owner/ManageShop'
import ManageInventory from './routes/owner/ManageInventory'
import ShopCarts from './routes/owner/ShopCarts'
import CsvUpload from './routes/owner/CsvUpload'
import RequireOwner from './component/RequireOwner'
import useAuth from './hooks/useAuth'
import { getLoginUrl, isShopOwner, logout } from './api/auth'

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <div className="app-header">
        <div>
          {user?.email
            ? `Logged in as ${user.email} (${(user['cognito:groups'] ?? []).join(', ')})`
            : null}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user && isShopOwner() && <Link to="/owner">My Shops</Link>}
          {user
            ? <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Logout</a>
            : <a href={getLoginUrl()}>Login</a>}
        </div>
      </div>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/shops/:shopId" element={<Shop />}>
          <Route index element={<ShopHome />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/:inventoryId" element={<Card />} />
          <Route path="cart" element={<Cart />} />

          <Route path="drill/:drillKey" element={<SearchDrill />} />
          <Route path="drill/:drillKey/:drillValue" element={<Cards />} />

          <Route path="moxfield/search" element={<MoxSearch />} />
        </Route>
        <Route path="/owner" element={<RequireOwner><OwnerDashboard /></RequireOwner>} />
        <Route path="/owner/shops/:shopId" element={<RequireOwner><ManageShop /></RequireOwner>}>
          <Route index element={<ManageInventory />} />
          <Route path="carts" element={<ShopCarts />} />
          <Route path="upload" element={<CsvUpload />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  )
}
