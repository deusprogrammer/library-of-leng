import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Shop from './routes/Shop'
import CategoryView from './routes/CategoryView'
import Cards from './routes/Cards'
import Inventory from './routes/shops/Inventory'
import Cart from './routes/Cart'
import ShopHome from './routes/shops/ShopHome'
import Card from './routes/Card'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/shops/:shopId" element={<Shop />}>
          <Route index element={<ShopHome />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/:inventoryId" element={<Card />} />
          <Route path="cart" element={<Cart />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
