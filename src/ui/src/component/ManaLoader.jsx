import React, { useState } from 'react';

// Kitschy Magic: The Gathering turn-structure/stack lingo for the loading phrase.
const PHRASES = [
    "Untap, upkeep, draw...",
    "Passing priority...",
    "Resolving the stack...",
    "Shuffling your library...",
    "Declaring attackers...",
    "Paying the mana cost...",
    "Searching your library...",
    "Scrying for answers...",
    "Casting at instant speed...",
    "Tapping out...",
    "Checking state-based actions...",
    "Mulligan to six..."
];

const pickPhrase = () => PHRASES[Math.floor(Math.random() * PHRASES.length)];

/**
 * Loading interstitial: the five Magic mana colors orbiting a kitschy
 * loading phrase. Pass `phrase` to override the random flavor text with
 * something context-specific (e.g. upload progress).
 */
const ManaLoader = ({ phrase }) => {
    const [randomPhrase] = useState(pickPhrase);

    return (
        <div className="loading-screen">
            <div className="mana-loader">
                <div className="mana-loader__orbit">
                    <span className="mana-dot mana-dot--w" />
                    <span className="mana-dot mana-dot--u" />
                    <span className="mana-dot mana-dot--b" />
                    <span className="mana-dot mana-dot--r" />
                    <span className="mana-dot mana-dot--g" />
                </div>
                <div className="mana-loader__phrase">{phrase ?? randomPhrase}</div>
            </div>
        </div>
    );
};

export default ManaLoader;
