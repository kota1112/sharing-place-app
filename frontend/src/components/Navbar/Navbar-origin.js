export default function Navbar() {
    return (
      <header className="bg-blue-400">
        <nav aria-label="Primary">
          <a href="/home">Home</a>
  
          <button type="button" aria-label="Open menu" aria-expanded="false">
            Menu
          </button>
  
          <ul>
            <li>
              <a href="#">Features</a>
            </li>
          </ul>
  
          <form action="#" method="get" role="search">
            <label>
              <input type="search" name="q" placeholder="Search" />
            </label>
            <button type="submit" className="bg-red-300">
              Search
            </button>
          </form>
  
          <div>
            <a href="#">Log in</a>
          </div>
        </nav>
  
        <div hidden>
          <ul>
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <a href="#">Features</a>
            </li>
            <li>
              <a href="#">Pricing</a>
            </li>
            <li>
              <a href="#">About</a>
            </li>
          </ul>
        </div>
      </header>
    );
  }
  