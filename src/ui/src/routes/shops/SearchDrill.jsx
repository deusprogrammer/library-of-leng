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

    return (
        <>
            {drills[drillKey] && drills[drillKey].map((drillValue) => <Link to={`/shops/${shopId}/drill/${drillKey}/${drillValue.code || drillValue}`}><button>{drillValue.name || drillValue}</button></Link>)}
        </>
    )
}

export default SearchDrill;