import React from 'react';

export const formatMoney = (value) => (
    value === null || value === undefined ? '—' : `$${Number(value).toFixed(2)}`
);

const CartItemsTable = ({ items, total, showPrices = false }) => {
    if (!items?.length) {
        return <div>Cart is empty.</div>;
    }

    return (
        <div className="table-scroll">
            <table className="cart-items-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Set</th>
                        <th>Finish</th>
                        <th className="numeric">Qty</th>
                        {showPrices && <th className="numeric">Price</th>}
                        {showPrices && <th className="numeric">Subtotal</th>}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.itemKey}>
                            <td>{item.name}</td>
                            <td>{item.setCode?.toUpperCase()}</td>
                            <td>{item.finish}</td>
                            <td className="numeric">{item.quantity}</td>
                            {showPrices && <td className="numeric">{formatMoney(item.unitPrice)}</td>}
                            {showPrices && <td className="numeric">{formatMoney(item.lineTotal)}</td>}
                        </tr>
                    ))}
                </tbody>
                {showPrices && (
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="numeric">Total</td>
                            <td className="numeric">{formatMoney(total)}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
};

export default CartItemsTable;
