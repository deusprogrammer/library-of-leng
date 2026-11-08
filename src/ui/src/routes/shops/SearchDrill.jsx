import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSets } from '../../api/scryfall/scry-client';
import { CATEGORIES, COLORS, RARITIES } from '../../etc/filters';
import ManaLoader from '../../component/ManaLoader';

const SearchDrill = () => {
    const [drills, setDrills] = useState({
        set: [],
        category: [...CATEGORIES],
        rarity: [...RARITIES],
        color: [...COLORS]
    });
    const [setsLoading, setSetsLoading] = useState(true);
    const [setFilter, setSetFilter] = useState("");
    const { drillKey, shopId } = useParams();

    useEffect(() => {
        (async () => {
            try {
                const sets = await getSets();

                setDrills((existing) => ({
                    ...existing,
                    set: [...sets]
                }));
            } catch (err) {
                console.error("Unable to load Scryfall sets for drill page", err);
            } finally {
                setSetsLoading(false);
            }
        })();
    }, []);

    if (drillKey === "set" && setsLoading) {
        return <ManaLoader />;
    }

    const values = drills[drillKey] ?? [];

    if (drillKey === "set") {
        const filteredSets = values.filter((set) =>
            set.name.toLowerCase().includes(setFilter.toLowerCase()) ||
            set.code.toLowerCase().includes(setFilter.toLowerCase())
        );

        return (
            <div className="page">
                <input
                    className="set-search"
                    type="text"
                    placeholder="Search sets..."
                    value={setFilter}
                    onChange={(e) => setSetFilter(e.target.value)}
                />
                <div className="option-list">
                    {filteredSets.map((set) => (
                        <Link
                            key={set.code}
                            to={`/shops/${shopId}/drill/${drillKey}/${set.code}`}
                            className="option-tile"
                        >
                            <span>{set.name}</span>
                            <span className="set-code">{set.code.toUpperCase()}</span>
                        </Link>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="filter-list">
                {values.map((value) => (
                    <Link
                        key={value}
                        to={`/shops/${shopId}/drill/${drillKey}/${value}`}
                        className="filter-tile"
                    >
                        {value}
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default SearchDrill;