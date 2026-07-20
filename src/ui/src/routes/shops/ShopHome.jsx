import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

const ShopHome = () => {
    const { shopId } = useParams();

    return (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
            <Link to={`/shops/${shopId}/inventory`}>Inventory</Link>
        </div>
    );
}

export default ShopHome;