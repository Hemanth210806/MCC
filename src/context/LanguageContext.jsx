import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const TRANSLATIONS = {
  en: {
    // Nav & General
    mcc_title: 'Mysuru City Corporation',
    mcc_kannada: 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ',
    portal_tag: 'AI-Powered Civic Issue Monitoring & SLA System',
    emergency_helpline: 'Emergency Helpline: 0821-2440890',
    wards_tag: '65 Municipal Wards',
    home: 'Home',
    public_map: 'Public Map',
    file_complaint: 'File Complaint',
    track_issue: 'Track Issue',
    about: 'About',
    staff_login: 'Staff Login',
    menu: 'Menu',
    logout: 'Logout',
    switch_lang: 'ಕನ್ನಡ',
    switch_lang_title: 'Switch to Kannada',

    // Hero
    official_monitoring: 'Official AI Civic Monitoring • Mysuru City Corporation',
    palace_tag: '🏛️ Mysore Palace (Full View) • Ward 51 (Agrahara)',
    hero_title_1: 'Empowering Citizens.',
    hero_title_2: 'Accelerating Civic Resolutions in Mysuru.',
    hero_desc: 'Report garbage, potholes, and streetlight faults across heritage and municipal zones in seconds. Powered by deep learning image recognition, authentic 65-ward GIS boundaries, and automated department SLAs.',
    file_issue_now: 'File a Civic Issue Now',
    track_your_complaint: 'Track Your Complaint',
    live_ward_map: 'Live 65-Ward Map',

    // Stats
    total_civic_reports: 'Total Civic Reports',
    verified_resolutions: 'Verified Resolutions',
    active_hotspots: 'DBSCAN Hotspots',
    municipal_wards: 'Municipal Wards',
    resolution_rate: 'City Resolution Rate',

    // Track Issue
    track_page_title: 'Track Civic Issues & Grievance Directory',
    track_page_desc: 'Track the live status of your specific complaint, filter reported civic issues across all 65 Mysuru municipal wards, or inspect the ward complaint density heat map.',
    tab_track_id: 'Track by Complaint ID',
    track_by_id: 'Track by Complaint ID',
    tab_directory: 'Search & Filter Directory',
    search_directory: 'Search & Filter Directory',
    tab_heatmap: 'Ward Density Heat Map',
    complaint_id_placeholder: 'Complaint ID (e.g. MCC-2026-00012)',
    mobile_placeholder: 'Mobile Number (Optional)',
    track_btn: 'Track',
    checking: 'Checking...',

    // Filter controls
    filter_heading: 'Multi-Criteria Complaint Filter',
    search_keyword_label: 'Search by Keyword, Complaint Code, or Ward Name',
    search_keyword_placeholder: "Search e.g. 'MCC-2026-00014', 'pothole', 'Agrahara', 'J P Nagar'...",
    status_label: 'Status',
    priority_label: 'Priority',
    ward_label: 'Mysuru Municipal Ward',
    all_statuses: 'All Statuses',
    all_priorities: 'All Priorities',
    all_wards: 'All 65 Wards',
    reset_filters: 'Reset Filters',
    showing_complaints: 'Showing {count} complaints matching current filters',
    track_timeline: 'Track Timeline',

    // Heatmap
    heatmap_title: 'Civic Complaint Density & Vulnerability Heat Map',
    heatmap_desc: 'Visualizes real-time complaint concentration across all 65 Mysuru wards. High-density zones trigger urgent municipal response protocols.',
    critical_density: 'Critical Density (>6 issues)',
    high_density: 'High Density (4-6 issues)',
    moderate_density: 'Moderate Density (2-3 issues)',
    low_density: 'Low / Stable (0-1 issues)',
    ward_density_info: 'Click any ward to inspect complaint density and breakdown.',

    faq_heading: 'Frequently Asked Questions & Resolution Lifecycles',
    faq_subheading: 'Understand department SLAs, on-site field procedures, and GPS verification before contacting support.',
    toll_free: 'Toll-Free Helpline',
    control_room: 'Control Room: 0821-2440890',

    // Home Highlights & Missing Keys
    report_now: 'File Issue Now',
    track_complaint: 'Track Complaint',
    explore_map: 'Explore Ward Map',
    stat_total: 'Total Grievances',
    stat_resolved: 'Verified Resolved',
    stat_hotspots: 'Active Hotspots',
    stat_wards: 'Municipal Wards',
    categories_title: 'Civic Complaint Domains & Automated Routing',
    categories_subtitle: 'MCC AI engine dispatches each grievance directly to the assigned department SLA queue.',
    how_works_title: 'How MCC Civic Resolution System Works',
    how_works_subtitle: 'From citizen photo capture to GPS-verified on-site resolution in 5 transparent steps.',
    dashboard: 'Dashboard',
    go_to_dashboard: 'Go to Dashboard',
    active_session: 'Active Staff Session',
    switch_account: 'Switch Account / Logout',
    instant_login: '⚡ 1-Click Login',
    fill_creds: 'Fill',
    staff_portal_title: 'Staff Access Portal',
    staff_portal_desc: 'Mysuru City Corporation Official Authentication & Governance System'
  },
  kn: {
    // Nav & General
    mcc_title: 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ',
    mcc_kannada: 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ',
    portal_tag: 'ಎಐ-ಚಾಲಿತ ನಾಗರಿಕ ಸಮಸ್ಯೆ ಉಸ್ತುವಾರಿ ಮತ್ತು ಪರಿಹಾರ ವ್ಯವಸ್ಥೆ',
    emergency_helpline: 'ತುರ್ತು ಸಹಾಯವಾಣಿ: 0821-2440890',
    wards_tag: '೬೫ ಪಾಲಿಕೆ ವಾರ್ಡ್‌ಗಳು',
    home: 'ಮುಖಪುಟ',
    public_map: 'ಸಾರ್ವಜನಿಕ ನಕ್ಷೆ',
    file_complaint: 'ದೂರು ದಾಖಲಿಸಿ',
    track_issue: 'ದೂರು ಪರಿಶೀಲನೆ',
    about: 'ನಮ್ಮ ಬಗ್ಗೆ',
    staff_login: 'ಸಿಬ್ಬಂದಿ ಲಾಗಿನ್',
    menu: 'ಮೆನು',
    logout: 'ನಿರ್ಗಮಿಸಿ',
    switch_lang: 'English',
    switch_lang_title: 'Switch to English',

    // Hero
    official_monitoring: 'ಅಧಿಕೃತ ಎಐ ನಾಗರಿಕ ಉಸ್ತುವಾರಿ • ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ',
    palace_tag: '🏛️ ಮೈಸೂರು ಅರಮನೆ (ಸಂಪೂರ್ಣ ನೋಟ) • ವಾರ್ಡ್ ೫೧ (ಅಗ್ರಹಾರ)',
    hero_title_1: 'ನಾಗರಿಕರ ಸಬಲೀಕರಣ.',
    hero_title_2: 'ಮೈಸೂರಿನಲ್ಲಿ ನಾಗರಿಕ ಸಮಸ್ಯೆಗಳಿಗೆ ಶೀಘ್ರ ಪರಿಹಾರ.',
    hero_desc: 'ಕಸದ ರಾಶಿ, ರಸ್ತೆ ಗುಂಡಿ, ಮತ್ತು ಬೀದಿದೀಪ ದೋಷಗಳನ್ನು ಕ್ಷಣಾರ್ಧದಲ್ಲಿ ವರದಿ ಮಾಡಿ. ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯ ಚಿತ್ರ ಗುರುತಿಸುವಿಕೆ, ೬೫ ನೈಜ ವಾರ್ಡ್ ನಕ್ಷೆ ಗಡಿಗಳು, ಮತ್ತು ಸ್ವಯಂಚಾಲಿತ ಎಸ್.ಎಲ್.ಎ ಕಾಲಮಿತಿ ವ್ಯವಸ್ಥೆ.',
    file_issue_now: 'ಈಗಲೇ ದೂರು ದಾಖಲಿಸಿ',
    track_your_complaint: 'ನಿಮ್ಮ ದೂರನ್ನು ಪರಿಶೀಲಿಸಿ',
    live_ward_map: '೬೫ ವಾರ್ಡ್‌ಗಳ ನೇರ ನಕ್ಷೆ',

    // Stats
    total_civic_reports: 'ಒಟ್ಟು ನಾಗರಿಕ ದೂರುಗಳು',
    verified_resolutions: 'ಪರಿಹರಿಸಲಾದ ದೂರುಗಳು',
    active_hotspots: 'ಸಕ್ರಿಯ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು',
    municipal_wards: 'ಪಾಲಿಕೆ ವಾರ್ಡ್‌ಗಳು',
    resolution_rate: 'ನಗರ ಪರಿಹಾರ ದರ',

    // Track Issue
    track_page_title: 'ದೂರು ಸ್ಥಿತಿ ಪರಿಶೀಲನೆ ಮತ್ತು ವಾರ್ಡ್ ಡೈರೆಕ್ಟರಿ',
    track_page_desc: 'ನಿಮ್ಮ ದೂರನ್ನು ಐಡಿ ಮೂಲಕ ಹುಡುಕಿ, ೬೫ ವಾರ್ಡ್‌ಗಳ ದೂರುಗಳನ್ನು ಶೋಧಿಸಿ ಅಥವಾ ವಾರ್ಡ್ ಸಾಂದ್ರತೆಯ ಹೀಟ್‌ಮ್ಯಾಪ್ ನಕ್ಷೆ ವೀಕ್ಷಿಸಿ.',
    tab_track_id: 'ದೂರು ಐಡಿ ಮೂಲಕ ಹುಡುಕಿ',
    track_by_id: 'ದೂರು ಐಡಿ ಮೂಲಕ ಹುಡುಕಿ',
    tab_directory: 'ವಾರ್ಡ್ ದೂರುಗಳ ಶೋಧನೆ',
    search_directory: 'ವಾರ್ಡ್ ದೂರುಗಳ ಶೋಧನೆ',
    tab_heatmap: 'ವಾರ್ಡ್ ಸಾಂದ್ರತೆ ಹೀಟ್‌ಮ್ಯಾಪ್',
    complaint_id_placeholder: 'ದೂರು ಐಡಿ (ಉದಾ: MCC-2026-00012)',
    mobile_placeholder: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)',
    track_btn: 'ಪರಿಶೀಲಿಸಿ',
    checking: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',

    // Filter controls
    filter_heading: 'ಬಹು-ಮಾನದಂಡ ದೂರು ಶೋಧಕ',
    search_keyword_label: 'ಕೀವರ್ಡ್, ದೂರು ಕೋಡ್ ಅಥವಾ ವಾರ್ಡ್ ಹೆಸರಿನ ಮೂಲಕ ಹುಡುಕಿ',
    search_keyword_placeholder: "ಉದಾಹರಣೆಗೆ 'MCC-2026-00014', 'ಗುಂಡಿ', 'ಅಗ್ರಹಾರ', 'ಜೆ ಪಿ ನಗರ'...",
    status_label: 'ದೂರಿನ ಸ್ಥಿತಿ',
    priority_label: 'ಆದ್ಯತೆ',
    ward_label: 'ಮೈಸೂರು ಪಾಲಿಕೆ ವಾರ್ಡ್',
    all_statuses: 'ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು',
    all_priorities: 'ಎಲ್ಲಾ ಆದ್ಯತೆಗಳು',
    all_wards: 'ಎಲ್ಲಾ ೬೫ ವಾರ್ಡ್‌ಗಳು',
    reset_filters: 'ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ',
    showing_complaints: 'ಪ್ರಸ್ತುತ ಫಿಲ್ಟರ್‌ಗೆ ಸರಿಹೊಂದುವ {count} ದೂರುಗಳು',
    track_timeline: 'ಟೈಮ್‌ಲೈನ್ ನೋಡಿ',

    // Heatmap
    heatmap_title: 'ನಾಗರಿಕ ದೂರು ಸಾಂದ್ರತೆ ಮತ್ತು ಸೂಕ್ಷ್ಮ ಪ್ರದೇಶ ಹೀಟ್‌ಮ್ಯಾಪ್',
    heatmap_desc: '೬೫ ವಾರ್ಡ್‌ಗಳಲ್ಲಿನ ನೈಜ-ಸಮಯದ ದೂರು ಸಾಂದ್ರತೆಯನ್ನು ತೋರಿಸುತ್ತದೆ. ಹೆಚ್ಚಿನ ಸಾಂದ್ರತೆಯುಳ್ಳ ವಾರ್ಡ್‌ಗಳಿಗೆ ತುರ್ತು ಪಾಲಿಕೆ ತಂಡ ನಿಯೋಜನೆಗೊಳ್ಳುತ್ತದೆ.',
    critical_density: 'ತೀವ್ರ ಸಾಂದ್ರತೆ (>೬ ದೂರುಗಳು)',
    high_density: 'ಹೆಚ್ಚಿನ ಸಾಂದ್ರತೆ (೪-೬ ದೂರುಗಳು)',
    moderate_density: 'ಮಧ್ಯಮ ಸಾಂದ್ರತೆ (೨-೩ ದೂರುಗಳು)',
    low_density: 'ಕಡಿಮೆ / ಸ್ಥಿರ (೦-೧ ದೂರು)',
    ward_density_info: 'ಸಾಂದ್ರತೆ ಮತ್ತು ದೂರು ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಯಾವುದೇ ವಾರ್ಡ್ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ.',

    // FAQ
    faq_heading: 'ಪದೇ ಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು ಮತ್ತು ಪರಿಹಾರ ಪ್ರಕ್ರಿಯೆ',
    faq_subheading: 'ಸಹಾಯವಾಣಿ ಸಂಪರ್ಕಿಸುವ ಮುನ್ನ ಇಲಾಖಾ ಕಾಲಮಿತಿಗಳು (ಎಸ್.ಎಲ್.ಎ) ಮತ್ತು ಜಿಪಿಎಸ್ ಪರಿಶೀಲನೆ ನಿಯಮಗಳನ್ನು ತಿಳಿಯಿರಿ.',
    toll_free: 'ಉಚಿತ ಸಹಾಯವಾಣಿ',
    control_room: 'ನಿಯಂತ್ರಣ ಕೊಠಡಿ: 0821-2440890',

    // Home Highlights & Missing Keys
    report_now: 'ಈಗಲೇ ದೂರು ದಾಖಲಿಸಿ',
    track_complaint: 'ದೂರು ಪರಿಶೀಲಿಸಿ',
    explore_map: 'ವಾರ್ಡ್ ನಕ್ಷೆ ವೀಕ್ಷಿಸಿ',
    stat_total: 'ಒಟ್ಟು ದೂರುಗಳು',
    stat_resolved: 'ಪರಿಹರಿಸಲಾದ ದೂರುಗಳು',
    stat_hotspots: 'ಸಕ್ರಿಯ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು',
    stat_wards: 'ಪಾಲಿಕೆ ವಾರ್ಡ್‌ಗಳು',
    categories_title: 'ನಾಗರಿಕ ದೂರು ವಿಭಾಗಗಳು ಮತ್ತು ಸ್ವಯಂಚಾಲಿತ ನಿಯೋಜನೆ',
    categories_subtitle: 'ಪಾಲಿಕೆ ಎಐ ವ್ಯವಸ್ಥೆಯು ಪ್ರತಿಯೊಂದು ದೂರನ್ನು ಸಂಬಂಧಪಟ್ಟ ಇಲಾಖಾ ಸರದಿಗೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಕಳುಹಿಸುತ್ತದೆ.',
    how_works_title: 'ಪಾಲಿಕೆ ನಾಗರಿಕ ಪರಿಹಾರ ವ್ಯವಸ್ಥೆಯ ಕಾರ್ಯವಿಧಾನ',
    how_works_subtitle: 'ನಾಗರಿಕರ ಫೋಟೋ ದಾಖಲೆಯಿಂದ ಹಿಡಿದು ಜಿಪಿಎಸ್ ಪರಿಶೀಲಿತ ಪರಿಹಾರದವರೆಗೆ ೫ ಪಾರದರ್ಶಕ ಹಂತಗಳು.',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    go_to_dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹೋಗಿ',
    active_session: 'ಸಕ್ರಿಯ ಸಿಬ್ಬಂದಿ ಖಾತೆ',
    switch_account: 'ಖಾತೆ ಬದಲಾಯಿಸಿ / ನಿರ್ಗಮಿಸಿ',
    instant_login: '⚡ ೧-ಕ್ಲಿಕ್ ಲಾಗಿನ್',
    fill_creds: 'ಭರ್ತಿ ಮಾಡಿ',
    staff_portal_title: 'ಸಿಬ್ಬಂದಿ ಪ್ರವೇಶ ಪೋರ್ಟಲ್',
    staff_portal_desc: 'ಮೈಸೂರು ಮಹಾನಗರ ಪಾಲಿಕೆ ಅಧಿಕೃತ ದೃಢೀಕರಣ ಮತ್ತು ಆಡಳಿತ ವ್ಯವಸ್ಥೆ'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('mcc_language') || 'en';
    } catch (e) {
      return 'en';
    }
  });

  const toggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'kn' : 'en';
      try {
        localStorage.setItem('mcc_language', next);
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  const t = (key, params = {}) => {
    let text = TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      toggleLanguage: () => {},
      t: (key) => key
    };
  }
  return context;
};
