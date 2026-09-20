export default function Navbar({ goTo }) {
    return (
        <nav style={{
            background: 'lightgreen',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <span
                onClick={() => goTo('dashboard')}
                style={{ color: 'black', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }}
            >
                📦 Product Price Tracker
            </span>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    onClick={() => goTo('dashboard')}
                    style={{ background: 'purple', border: 'none', color: 'white', fontSize: '1rem' ,padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '1rem'}}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => goTo('search')}
                    style={{ background: 'green', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '1rem' }}
                >
                    + Track Product
                </button>
            </div>
        </nav>
    )
}