import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, BellRing, FileWarning, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="text-gradient">LANSLIDE</span>
      </div>
      
      <nav className="nav-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          end
        >
          <LayoutDashboard size={20} />
          <span>Citizen View</span>
        </NavLink>

        <NavLink 
          to="/admin" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <ShieldCheck size={20} />
          <span>Admin Dashboard</span>
        </NavLink>
        
        <NavLink 
          to="/regions" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <Map size={20} />
          <span>Regions</span>
        </NavLink>
        
        <NavLink 
          to="/alerts" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <BellRing size={20} />
          <span>Active Alerts</span>
        </NavLink>
        
        <NavLink 
          to="/reports" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <FileWarning size={20} />
          <span>Citizen Reports</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
