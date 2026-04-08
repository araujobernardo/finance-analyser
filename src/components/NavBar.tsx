import { NavLink } from "react-router-dom";
import "./NavBar.css";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/upload", label: "Upload" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

export function NavBar() {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <span className="navbar-brand">Finance Analyser</span>
      <ul className="navbar-links">
        {NAV_LINKS.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive ? "navbar-link navbar-link--active" : "navbar-link"
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
