import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const ShopHome = () => {
    const { shopId } = useParams();

    return (
        <div className="filter-list">
            <Link className="filter-tile" to={`/shops/${shopId}/inventory`}>All Inventory</Link>
            <Link className="filter-tile" to={`/shops/${shopId}/moxfield/search`}>Moxfield Search</Link>
            <Link className="filter-tile" to={`/shops/${shopId}/drill/category`}>By Category</Link>
            <Link className="filter-tile" to={`/shops/${shopId}/drill/rarity`}>By Rarity</Link>
            <Link className="filter-tile" to={`/shops/${shopId}/drill/color`}>By Color</Link>
            <Link className="filter-tile" to={`/shops/${shopId}/drill/set`}>By Set</Link>
        </div>
    );
}

export default ShopHome;