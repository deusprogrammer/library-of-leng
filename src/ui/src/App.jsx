import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import RegisterDevice from './routes/owner/RegisterDevice'
import DeviceRegistration from './routes/DeviceRegistration'
import { DeviceForbiddenRedirect, Forbidden } from './routes/Forbidden'
import RequireOwner from './component/RequireOwner'
import NavBar from './component/NavBar'
import useAuth from './hooks/useAuth'

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <NavBar user={user} />
      <DeviceForbiddenRedirect />
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
          <Route path="devices/register" element={<RegisterDevice />} />
        </Route>
        <Route path="/register/:shopId" element={<DeviceRegistration />} />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  )
}
