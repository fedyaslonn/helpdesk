import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getNavSections } from './navConfig';

const SidebarNav = ({ onNavigate }) => {
  const { user } = useAuth();
  if (!user) return null;

  const sections = getNavSections(user.role);

  return (
    <nav className="flex flex-col py-2">
      {sections.map((section) => (
        <div key={section.title} className="mb-2">
          <div className="hd-sidebar-section">{section.title}</div>
          <ul className="flex flex-col gap-0.5 px-2">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `hd-sidebar-link ${isActive ? 'hd-sidebar-link-active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export default SidebarNav;
