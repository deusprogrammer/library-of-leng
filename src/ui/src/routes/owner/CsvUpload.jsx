import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { parseManaboxCsv } from '../../etc/manabox';
import { addBatchInventory } from '../../api/lol/lol-owner-client';
import ManaLoader from '../../component/ManaLoader';

// Rows sent per request; keeps each lambda invocation well under its timeout.
const UPLOAD_CHUNK_SIZE = 75;

const CsvUpload = () => {
    const [items, setItems] = useState([]);
    const [invalidRows, setInvalidRows] = useState([]);
    const [fileName, setFileName] = useState(null);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);

    const { shopId } = useParams();

    const onFileChange = async (e) => {
        const file = e.target.files?.[0];

        setItems([]);
        setInvalidRows([]);
        setResults(null);
        setError(null);
        setFileName(file?.name ?? null);

        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const parsed = parseManaboxCsv(text);

            setItems(parsed.items);
            setInvalidRows(parsed.invalidRows);

            if (parsed.items.length === 0) {
                setError("No usable rows found in this file.");
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const onUpload = async () => {
        setUploading(true);
        setError(null);
        setResults(null);
        setProgress(0);

        const created = [];
        const failed = [];

        try {
            for (let start = 0; start < items.length; start += UPLOAD_CHUNK_SIZE) {
                const chunk = items.slice(start, start + UPLOAD_CHUNK_SIZE);
                const result = await addBatchInventory(shopId, chunk);

                created.push(...(result.created ?? []));
                failed.push(...(result.failed ?? []));
                setProgress(Math.min(start + UPLOAD_CHUNK_SIZE, items.length));
            }

            setResults({ created, failed });
            setItems([]);
        } catch (err) {
            console.error(err);
            setError(`${err.message} (${created.length} items were uploaded before the error)`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2>Mass Upload (Manabox CSV)</h2>

            <div>
                Upload a Manabox CSV export. Each row is matched by its Scryfall ID
                and added to this shop's inventory.
            </div>

            <input type="file" accept=".csv,text/csv" onChange={onFileChange} />

            {error && <div style={{ color: 'red' }}>{error}</div>}

            {invalidRows.length > 0 && (
                <div style={{ color: 'darkorange' }}>
                    Skipping {invalidRows.length} row(s) without a Scryfall ID
                    (lines: {invalidRows.map((row) => row.line).join(", ")}).
                </div>
            )}

            {items.length > 0 && !uploading && (
                <>
                    <div>
                        Parsed <b>{items.length}</b> row(s) from <b>{fileName}</b>
                        {" "}({items.reduce((total, item) => total + item.quantity, 0)} total cards).
                    </div>
                    <div className="table-scroll">
                    <table style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '5px' }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '5px' }}>Set</th>
                                <th style={{ textAlign: 'left', padding: '5px' }}>Finish</th>
                                <th style={{ textAlign: 'right', padding: '5px' }}>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.slice(0, 10).map((item, index) => (
                                <tr key={index}>
                                    <td style={{ padding: '5px' }}>{item.name}</td>
                                    <td style={{ padding: '5px' }}>{item.setCode?.toUpperCase()}</td>
                                    <td style={{ padding: '5px' }}>{item.finish}</td>
                                    <td style={{ padding: '5px', textAlign: 'right' }}>{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                    {items.length > 10 && <div>...and {items.length - 10} more.</div>}
                    <button onClick={onUpload}>Upload {items.length} row(s)</button>
                </>
            )}

            {uploading && (
                <ManaLoader phrase={`Uploading ${progress}/${items.length} cards...`} />
            )}

            {results && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ color: 'green' }}>
                        Upload complete: {results.created.length} item(s) added or updated.
                    </div>
                    {results.failed.length > 0 && (
                        <div style={{ color: 'red' }}>
                            {results.failed.length} item(s) failed:
                            <ul>
                                {results.failed.map((item, index) => (
                                    <li key={index}>
                                        {item.name ?? item.scryfallId} ({item.finish})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CsvUpload;
