import React from 'react';

const CartItemsTable = ({ items }) => {
    if (!items?.length) {
        return <div>Cart is empty.</div>;
    }

    return (
        <div className="table-scroll">
            <table style={{ borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', padding: '5px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '5px' }}>Set</th>
                        <th style={{ textAlign: 'left', padding: '5px' }}>Finish</th>
                        <th style={{ textAlign: 'right', padding: '5px' }}>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.itemKey}>
                            <td style={{ padding: '5px' }}>{item.name}</td>
                            <td style={{ padding: '5px' }}>{item.setCode?.toUpperCase()}</td>
                            <td style={{ padding: '5px' }}>{item.finish}</td>
                            <td style={{ padding: '5px', textAlign: 'right' }}>{item.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CartItemsTable;
