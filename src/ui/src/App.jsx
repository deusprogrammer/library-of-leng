import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Shop from './routes/Shop'
import CategoryView from './routes/CategoryView'
import Cards from './routes/shops/Cards'
import Inventory from './routes/shops/Inventory'
import Cart from './routes/shops/Cart'
import ShopHome from './routes/shops/ShopHome'
import Card from './routes/shops/Card'
import SearchDrill from './routes/shops/SearchDrill'
import MoxSearch from './routes/shops/MoxSearch'
import AuthCallback from './routes/AuthCallback'
import { useEffect, useState } from 'react'

function decodeJwt(token) {
  const [, payload] = token.split(".");

  return JSON.parse(
    atob(
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/")
    )
  );
}

export default function App() {
  const [user, setUser] = useState({});
  useEffect(() => {
    const idToken = sessionStorage.getItem("idToken");
    const user = decodeJwt(idToken);
    setUser(user);
    console.log(user);
  }, []);

  return (
    <>
      <div>
        {user?.email && `Logged in as ${user.email} (${user['cognito:groups'].join(', ')})`}
      </div>
      <BrowserRouter>
        <Routes>
          <Route path="/shops/:shopId" element={<Shop />}>
            <Route index element={<ShopHome />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/:inventoryId" element={<Card />} />
            <Route path="cart" element={<Cart />} />

            <Route path="drill/:drillKey" element={<SearchDrill />} />
            <Route path="drill/:drillKey/:drillValue" element={<Cards />} />

            <Route path="moxfield/search" element={<MoxSearch />} />
          </Route>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}
