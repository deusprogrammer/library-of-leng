import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const ShopHome = () => {
    const { shopId } = useParams();

    return (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
            <Link to={`/shops/${shopId}/inventory`}>All Inventory</Link>
            <Link to={`/shops/${shopId}/moxfield/search`}>Moxfield Search</Link>
            <Link to={`/shops/${shopId}/drill/category`}>By Category</Link>
            <Link to={`/shops/${shopId}/drill/rarity`}>By Rarity</Link>
            <Link to={`/shops/${shopId}/drill/color`}>By Color</Link>
            <Link to={`/shops/${shopId}/drill/set`}>By Set</Link>
        </div>
    );
}

export default ShopHome;