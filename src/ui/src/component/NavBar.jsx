import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { cartAtom } from '../atoms/CartAtom';
import { getLoginUrl, isShopOwner, logout } from '../api/auth';

const CartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
);

const NavBar = ({ user }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const headerRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const cart = useAtomValue(cartAtom);

    // The bar lives outside <Routes>, so derive the shop context from the URL.
    const shopMatch = useMatch('/shops/:shopId/*');
    const shopId = shopMatch?.params?.shopId;
    const cartCount = shopId && Array.isArray(cart?.items) ? cart.items.length : 0;

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const onPointerDown = (e) => {
            if (headerRef.current && !headerRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    return (
        <header className="topbar" ref={headerRef}>
            <div className="topbar-start">
                {shopId && (
                    <button type="button" className="nav-button" onClick={() => navigate(-1)} aria-label="Go back">
                        <span aria-hidden="true">‹</span>
                        <span className="nav-button-label">Back</span>
                    </button>
                )}
                <Link className="topbar-brand" to={shopId ? `/shops/${shopId}` : '/'}>Library of Leng</Link>
            </div>

            <div className="topbar-end">
                {shopId && (
                    <NavLink className="nav-button cart-link" to={`/shops/${shopId}/cart`} aria-label={`Cart, ${cartCount} items`}>
                        <CartIcon />
                        <span className="nav-button-label">Cart</span>
                        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                    </NavLink>
                )}
                <button
                    type="button"
                    className="hamburger"
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                    aria-controls="topbar-menu"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span /><span /><span />
                </button>
            </div>

            <nav id="topbar-menu" className={`topbar-menu${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)}>
                {shopId && <NavLink className="menu-link" to={`/shops/${shopId}`} end>Shop Home</NavLink>}
                {user && isShopOwner() && <NavLink className="menu-link" to="/owner">My Shops</NavLink>}
                {user?.email && <span className="user-chip" title={user.email}>{user.email}</span>}
                {user
                    ? <button type="button" className="menu-link menu-action" onClick={logout} title={user.email ? `Signed in as ${user.email}` : undefined}>Log out</button>
                    : <a className="menu-link menu-action" href={getLoginUrl()}>Log in</a>}
            </nav>
        </header>
    );
};

export default NavBar;
