import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createShop, getMyShops } from '../../api/lol/lol-owner-client';
import ManaLoader from '../../component/ManaLoader';

const OwnerDashboard = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [creating, setCreating] = useState(false);

    const loadShops = async () => {
        setLoading(true);
        setError(null);

        try {
            setShops(await getMyShops());
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShops();
    }, []);

    const onCreateShop = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        setCreating(true);
        setError(null);

        try {
            await createShop({
                name: name.trim(),
                ...(slug.trim() ? { slug: slug.trim() } : {})
            });
            setName("");
            setSlug("");
            await loadShops();
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '10px' }}>
            <h1>My Shops</h1>

            {error && <div style={{ color: 'red' }}>{error}</div>}

            <form onSubmit={onCreateShop} style={{ display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                    Shop name
                    <input value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column' }}>
                    Slug (optional)
                    <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-shop" />
                </label>
                <button type="submit" disabled={creating || !name.trim()}>
                    {creating ? "Creating..." : "Create Shop"}
                </button>
            </form>

            {loading
                ? <ManaLoader />
                : shops.length === 0
                    ? <div>You don't own any shops yet. Create one above!</div>
                    : (
                        <table style={{ borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Slug</th>
                                    <th style={{ textAlign: 'left', padding: '5px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shops.map((shop) => (
                                    <tr key={shop.shopId}>
                                        <td style={{ padding: '5px' }}>{shop.name}</td>
                                        <td style={{ padding: '5px' }}>{shop.slug}</td>
                                        <td style={{ padding: '5px', display: 'flex', gap: '10px' }}>
                                            <Link to={`/owner/shops/${shop.shopId}`}>Manage</Link>
                                            <Link to={`/shops/${shop.slug ?? shop.shopId}`}>View Storefront</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
        </div>
    );
};

export default OwnerDashboard;
