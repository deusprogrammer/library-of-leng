import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShopInventory } from '../../api/lol/lol-inventory-client';
import { addBatchInventory, adjustInventory } from '../../api/lol/lol-owner-client';
import ManaLoader from '../../component/ManaLoader';

const ManageInventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyItem, setBusyItem] = useState(null);

    const [newScryfallId, setNewScryfallId] = useState("");
    const [newFinish, setNewFinish] = useState("nonfoil");
    const [newQuantity, setNewQuantity] = useState(1);
    const [adding, setAdding] = useState(false);

    const { shopId } = useParams();

    const loadInventory = async () => {
        setLoading(true);

        try {
            const inventoryData = await getShopInventory(shopId);
            setInventory(Array.isArray(inventoryData) ? inventoryData : []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, [shopId]);

    const adjustQuantity = async (item, delta) => {
        setBusyItem(item.inventoryId);
        setError(null);

        try {
            // Send the full item: upsertInventory requires all attributes to
            // be defined, and if_not_exists keeps the stored values anyway.
            const updated = await adjustInventory(shopId, {
                ...item,
                quantity: delta
            });

            setInventory((current) =>
                current.map((existing) =>
                    existing.inventoryId === updated.inventoryId
                        ? { ...existing, quantity: updated.quantity }
                        : existing
                )
            );
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setBusyItem(null);
        }
    };

    const onAddItem = async (e) => {
        e.preventDefault();

        if (!newScryfallId.trim()) {
            return;
        }

        setAdding(true);
        setError(null);

        try {
            // The batch endpoint enriches items with Scryfall card data.
            const result = await addBatchInventory(shopId, [{
                scryfallId: newScryfallId.trim(),
                finish: newFinish,
                quantity: Number(newQuantity) || 1
            }]);

            if (result.failed?.length) {
                setError("Card not found on Scryfall. Check the Scryfall ID.");
            } else {
                setNewScryfallId("");
                setNewQuantity(1);
                await loadInventory();
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2>Manage Inventory</h2>

            {error && <div style={{ color: 'red' }}>{error}</div>}

            <form onSubmit={onAddItem} style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                    Scryfall ID
                    <input value={newScryfallId} onChange={(e) => setNewScryfallId(e.target.value)} required />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                    Finish
                    <select value={newFinish} onChange={(e) => setNewFinish(e.target.value)}>
                        <option value="nonfoil">Non-foil</option>
                        <option value="foil">Foil</option>
                        <option value="etched">Etched</option>
                    </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                    Quantity
                    <input
                        type="number"
                        min="1"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        style={{ width: '60px' }}
                    />
                </label>
                <button type="submit" disabled={adding || !newScryfallId.trim()}>
                    {adding ? "Adding..." : "Add Card"}
                </button>
            </form>

            {loading
                ? <ManaLoader />
                : inventory.length === 0
                    ? <div>No inventory yet.</div>
                    : (
                        <div className="table-scroll">
                        <table style={{ borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '5px' }}></th>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Set</th>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Finish</th>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Rarity</th>
                                    <th style={{ textAlign: 'right', padding: '5px' }}>Quantity</th>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Adjust</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...inventory]
                                    .sort((item1, item2) => (item1.name ?? "").localeCompare(item2.name ?? ""))
                                    .map((item) => (
                                        <tr key={item.inventoryId}>
                                            <td style={{ padding: '5px' }}>
                                                {item.thumbnailUrl && <img src={item.thumbnailUrl} alt={item.name} style={{ height: '50px' }} />}
                                            </td>
                                            <td style={{ padding: '5px' }}>{item.name}</td>
                                            <td style={{ padding: '5px' }}>{item.setCode?.toUpperCase()}</td>
                                            <td style={{ padding: '5px' }}>{item.finish}</td>
                                            <td style={{ padding: '5px' }}>{item.rarity}</td>
                                            <td style={{ padding: '5px', textAlign: 'right' }}>{item.quantity}</td>
                                            <td style={{ padding: '5px' }}>
                                                <button
                                                    disabled={busyItem === item.inventoryId || item.quantity <= 0}
                                                    onClick={() => adjustQuantity(item, -1)}
                                                >-</button>
                                                <button
                                                    disabled={busyItem === item.inventoryId}
                                                    onClick={() => adjustQuantity(item, 1)}
                                                >+</button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        </div>
                    )}
        </div>
    );
};

export default ManageInventory;
