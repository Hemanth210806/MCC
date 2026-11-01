import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  HelpCircle, 
  ChevronDown, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Wrench, 
  Lightbulb, 
  Droplet, 
  AlertTriangle, 
  PhoneCall,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export default function CivicFAQ() {
  const { language, t } = useLanguage();
  const [openItem, setOpenItem] = useState('garbage'); // open first by default

  const faqItems = [
    {
      id: 'garbage',
      category: language === 'kn' ? 'ಘನತ್ಯಾಜ್ಯ ನಿರ್ವಹಣೆ' : 'Solid Waste Management',
      icon: Truck,
      color: '#4b5e28',
      question: language === 'kn' ? 'ಕಸ ಮತ್ತು ತ್ಯಾಜ್ಯ ವಿಲೇವಾರಿ ಪ್ರಕ್ರಿಯೆ ಹಾಗೂ ಎಸ್.ಎಲ್.ಎ ಏನು?' : 'How is Garbage and Solid Waste handled, and what is the SLA?',
      sla: language === 'kn' ? '೨೪ ಗಂಟೆ (ತೀವ್ರ) / ೭೨ ಗಂಟೆ (ಸಾಮಾನ್ಯ)' : '24 Hours (High Priority) / 72 Hours (Standard)',
      department: language === 'kn' ? 'ಘನತ್ಯಾಜ್ಯ ನಿರ್ವಹಣಾ ವಿಭಾಗ (SWM)' : 'Solid Waste Management Division (SWM)',
      summary: language === 'kn' 
        ? 'ರಸ್ತೆ ಬದಿಯ ಕಸ ಮತ್ತು ತುಂಬಿ ತುಳುಕುವ ಡಸ್ಟ್‌ಬಿನ್‌ಗಳನ್ನು ವಾರ್ಡ್ ನೈರ್ಮಲ್ಯ ನಿರೀಕ್ಷಕರಿಗೆ ತಕ್ಷಣ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.' 
        : 'Accumulated waste, open dumping, and overflowing municipal bins are automatically routed to the local Ward Sanitary Inspector.',
      steps: [
        {
          title: language === 'kn' ? 'ತ್ವರಿತ ನಿಯೋಜನೆ' : 'Instant Dispatch',
          detail: language === 'kn' ? 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಆಧಾರಿತ ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ ಮೂಲಕ ೧೫ ನಿಮಿಷದಲ್ಲಿ ದೂರು ರವಾನೆ.' : 'Image classification detects waste severity and auto-dispatches the grievance to the ward health inspector within 15 minutes.'
        },
        {
          title: language === 'kn' ? 'ಸ್ವಚ್ಛತಾ ತಂಡ ಆಗಮನ' : 'Squad Deployment',
          detail: language === 'kn' ? 'ಪಾಲಿಕೆ ವಾಹನಗಳು ಮತ್ತು ಪೌರಕಾರ್ಮಿಕರು ಸ್ಥಳಕ್ಕೆ ತೆರಳಿ ಸ್ವಚ್ಛಗೊಳಿಸುತ್ತಾರೆ.' : 'MCC compactors and sanitation workers are deployed to clear, sweep, and sanitize the site with disinfectant.'
        },
        {
          title: language === 'kn' ? 'ಜಿಯೋಟ್ಯಾಗ್ ಫೋಟೋ' : 'Geotagged Proof',
          detail: language === 'kn' ? 'ಕ್ಷೇತ್ರ ಅಧಿಕಾರಿಯು ಸ್ವಚ್ಛಗೊಳಿಸಿದ ಸ್ಥಳದ ಜಿಪಿಎಸ್ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡುತ್ತಾರೆ.' : 'Field officer captures a clean site photograph with live device GPS metadata to verify on-site completion.'
        },
        {
          title: language === 'kn' ? 'ಪರಿಶೀಲನೆ & ಮುಕ್ತಾಯ' : 'Audit & Closure',
          detail: language === 'kn' ? 'ಮುಖ್ಯ ಆಡಳಿತಾಧಿಕಾರಿಗಳು ಪರಿಶೀಲಿಸಿ ದೂರನ್ನು ಪರಿಹಾರವೆಂದು ಮುಕ್ತಾಯಗೊಳಿಸುತ್ತಾರೆ.' : 'Central Admin verifies original vs. resolution evidence side-by-side, marking the issue as RESOLVED.'
        }
      ]
    },
    {
      id: 'potholes',
      category: language === 'kn' ? 'ರಸ್ತೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ' : 'Roads & Infrastructure',
      icon: Wrench,
      color: '#b38328',
      question: language === 'kn' ? 'ರಸ್ತೆ ಗುಂಡಿಗಳು (ಪಾಟ್‌ಹೋಲ್ಸ್) ಹೇಗೆ ದುರಸ್ತಿಗೊಳ್ಳುತ್ತವೆ?' : 'How are Potholes and damaged roads repaired?',
      sla: language === 'kn' ? '೨೪ ಗಂಟೆ (ಮುಖ್ಯ ರಸ್ತೆ/ಶಾಲೆಗಳು) / ೭೨ ಗಂಟೆ (ಬಡಾವಣೆ)' : '24 Hours (Arterial / School Zones) / 72 Hours (Residential)',
      department: language === 'kn' ? 'ರಸ್ತೆ ಮತ್ತು ಮೂಲಸೌಕರ್ಯ ಎಂಜಿನಿಯರಿಂಗ್ ವಿಭಾಗ' : 'Roads & Infrastructure Engineering Division',
      summary: language === 'kn'
        ? 'ಶಾಲೆಗಳು, ಆಸ್ಪತ್ರೆಗಳು ಮತ್ತು ಬಸ್ ನಿಲ್ದಾಣಗಳ ಸಮೀಪವಿರುವ ಗುಂಡಿಗಳಿಗೆ ಹೆಚ್ಚಿನ ಆದ್ಯತೆ ನೀಡಲಾಗುತ್ತದೆ.'
        : 'Craters, road cave-ins, and dangerous asphalt cuts are prioritized based on proximity to transit stops, hospitals, and schools.',
      steps: [
        {
          title: language === 'kn' ? 'ಆದ್ಯತೆ ಲೆಕ್ಕಾಚಾರ' : 'Priority Calculation',
          detail: language === 'kn' ? 'ಸಂಚಾರ ದಟ್ಟಣೆ ಮತ್ತು ಸಮೀಪದ ಸಂಸ್ಥೆಗಳ ಆಧಾರದ ಮೇಲೆ ಅಪಾಯದ ಅಂಕ ನಿರ್ಧಾರ.' : 'The priority engine scores the hazard based on traffic volume and nearby institutional density.'
        },
        {
          title: language === 'kn' ? 'ಡಾಂಬರೀಕರಣ ದುರಸ್ತಿ' : 'Asphalt Patching',
          detail: language === 'kn' ? 'ತಾಂತ್ರಿಕ ಸಿಬ್ಬಂದಿ ಗುಂಡಿಯನ್ನು ತ್ವರಿತವಾಗಿ ಡಾಂಬರ್ ಮಿಶ್ರಣದಿಂದ ಭರ್ತಿ ಮಾಡುತ್ತಾರೆ.' : 'Engineering road maintenance team prepares, levels, and fills the crater with high-durability hot/cold asphalt mix.'
        },
        {
          title: language === 'kn' ? 'ಜಿಪಿಎಸ್ ಅಂತರ ಪರಿಶೀಲನೆ' : 'Haversine GPS Verification',
          detail: language === 'kn' ? 'ಮೂಲ ಸ್ಥಳದಲ್ಲೇ ದುರಸ್ತಿ ನಡೆದಿದೆಯೇ ಎಂದು ಜಿಪಿಎಸ್ ಅಂತರವನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪರೀಕ್ಷಿಸಲಾಗುತ್ತದೆ.' : 'System calculates the exact distance between the citizen GPS pin and resolution GPS to ensure the correct spot was repaired.'
        },
        {
          title: language === 'kn' ? 'ನಾಗರಿಕರ ರೇಟಿಂಗ್' : 'Citizen Rating',
          detail: language === 'kn' ? 'ಕಾಮಗಾರಿಯ ಗುಣಮಟ್ಟಕ್ಕೆ ನಾಗರಿಕರು ೧ ರಿಂದ ೫ ನಕ್ಷತ್ರಗಳ ರೇಟಿಂಗ್ ನೀಡಬಹುದು.' : 'Ticket is marked as resolved and citizen receives an alert to rate the quality of the road repair from 1 to 5 stars.'
        }
      ]
    },
    {
      id: 'streetlights',
      category: language === 'kn' ? 'ವಿದ್ಯುತ್ & ಬೀದಿದೀಪ' : 'Electrical & Lighting',
      icon: Lightbulb,
      color: '#4b5e28',
      question: language === 'kn' ? 'ಬೀದಿದೀಪಗಳ ಸಮಸ್ಯೆಗೆ ಕಾಲಮಿತಿ ಎಷ್ಟು?' : 'What is the turnaround time for non-functional streetlights?',
      sla: language === 'kn' ? '೨೪ ಗಂಟೆ (ಪ್ರಮುಖ ಜಂಕ್ಷನ್) / ೪೮ ಗಂಟೆ (ಸಾಮಾನ್ಯ ಬೀದಿ)' : '24 Hours (Major Junctions) / 48 Hours (Standard Streets)',
      department: language === 'kn' ? 'ವಿದ್ಯುತ್ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಬೆಳಕಿನ ವಿಭಾಗ' : 'Electrical & Street Lighting Division',
      summary: language === 'kn'
        ? 'ಕತ್ತಲಾದ ರಸ್ತೆಗಳು, ಸುಟ್ಟುಹೋದ ಎಲ್‌ಇಡಿ ಬಲ್ಬ್‌ಗಳು ಮತ್ತು ಅಪಾಯಕಾರಿ ತಂತಿಗಳನ್ನು ಸ್ಥಳೀಯ ಲೈನ್‌ಮನ್‌ಗಳು ಸರಿಪಡಿಸುತ್ತಾರೆ.'
        : 'Dark street stretches, flickering fixtures, damaged poles, and hazardous loose wiring are dispatched to zonal linemen.',
      steps: [
        {
          title: language === 'kn' ? 'ಲೈನ್‌ಮನ್ ನಿಯೋಜನೆ' : 'Ward Lineman Assignment',
          detail: language === 'kn' ? 'ಕಂಬದ ಸ್ಥಳ ಮತ್ತು ಹತ್ತಿರದ ಹೆಗ್ಗುರುತು ಮಾಹಿತಿಯೊಂದಿಗೆ ತಂಡಕ್ಕೆ ರವಾನೆ.' : 'The ticket routes to the specific ward electrical squad along with pole location and nearby landmark data.'
        },
        {
          title: language === 'kn' ? 'ಘಟಕ ಬದಲಾವಣೆ' : 'Component Replacement',
          detail: language === 'kn' ? 'ಫ್ಯೂಸ್, ಟೈಮರ್ ಅಥವಾ ಎಲ್‌ಇಡಿ ಫಿಕ್ಚರ್ ಬದಲಾಯಿಸಿ ವಿದ್ಯುತ್ ಮರುಸ್ಥಾಪನೆ.' : 'Linemen inspect transformer fuses, timers, and replace damaged LED fixtures or cabling with hydraulic ladder vehicles.'
        },
        {
          title: language === 'kn' ? 'ರಾತ್ರಿ ಬೆಳಕಿನ ಪುರಾವೆ' : 'Night Illumination Proof',
          detail: language === 'kn' ? 'ಬೆಳಗುತ್ತಿರುವ ದೀಪದ ಪುರಾವೆ ಫೋಟೋವನ್ನು ಕ್ಷೇತ್ರ ಸಿಬ್ಬಂದಿ ಅಪ್‌ಲೋಡ್ ಮಾಡುತ್ತಾರೆ.' : 'Field officer submits an illuminated proof photograph captured at the repair site.'
        },
        {
          title: language === 'kn' ? 'ವಾರ್ಡ್ ಸ್ಕೋರ್ ನವೀಕರಣ' : 'Resolution Approval',
          detail: language === 'kn' ? 'ಪಾಲಿಕೆ ಅಡ್ಮಿನ್ ಅನುಮೋದಿಸಿ ವಾರ್ಡ್‌ನ ನಾಗರಿಕ ಆರೋಗ್ಯ ಸೂಚ್ಯಂಕವನ್ನು ನವೀಕರಿಸುತ್ತಾರೆ.' : 'Admin verifies the lighting restore and updates the Ward Civic Health Score index.'
        }
      ]
    },
    {
      id: 'water',
      category: language === 'kn' ? 'ಕುಡಿಯುವ ನೀರು ಮತ್ತು ಒಳಚರಂಡಿ' : 'Water Supply & Sewerage',
      icon: Droplet,
      color: '#2e5b88',
      question: language === 'kn' ? 'ಕುಡಿಯುವ ನೀರಿನ ಪೈಪ್‌ಲೈನ್ ಸೋರಿಕೆ ಹೇಗೆ ಪರಿಹಾರವಾಗುತ್ತದೆ?' : 'How are Drinking Water pipeline leaks and burst mains resolved?',
      sla: language === 'kn' ? '೧೨ ಗಂಟೆ (ಮುಖ್ಯ ಪೈಪ್ ಬಿರುಕು) / ೨೪ ಗಂಟೆ (ವಾಲ್ವ್ ಸೋರಿಕೆ)' : '12 Hours (Main Pipeline Burst) / 24 Hours (Valve / Distribution Leak)',
      department: language === 'kn' ? 'ಮೈಸೂರು ನೀರು ಸರಬರಾಜು ಮತ್ತು ಒಳಚರಂಡಿ ಮಂಡಳಿ (KUWSDB & MCC)' : 'Mysuru Water Supply & Sewerage Board (KUWSDB & MCC)',
      summary: language === 'kn'
        ? 'ಕುಡಿಯುವ ನೀರು ವ್ಯರ್ಥವಾಗುವುದನ್ನು ತಡೆಯಲು ನೀರಿನ ಸೋರಿಕೆ ದೂರುಗಳಿಗೆ ಗರಿಷ್ಠ ತೀವ್ರತೆಯ ಅಂಕ ನೀಡಲಾಗುತ್ತದೆ.'
        : 'Drinking water pipeline bursts and sewage overflow receive the highest base severity score (45/100) to minimize potable water waste.',
      steps: [
        {
          title: language === 'kn' ? 'ವಾಲ್ವ್ ಬಂದ್' : 'Rapid Valve Isolation',
          detail: language === 'kn' ? 'ನೀರು ವ್ಯರ್ಥವಾಗುವುದನ್ನು ತಡೆಯಲು ತುರ್ತು ತಂಡವು ಉಪ-ಕವಾಟವನ್ನು ತಕ್ಷಣ ಬಂದ್ ಮಾಡುತ್ತದೆ.' : 'Emergency response squad isolates the immediate sub-feeder valve to stop water wastage while maintaining surrounding flow.'
        },
        {
          title: language === 'kn' ? 'ವೆಲ್ಡಿಂಗ್ ಮತ್ತು ದುರಸ್ತಿ' : 'Excavation & Welding',
          detail: language === 'kn' ? 'ಹಾನಿಗೊಳಗಾದ ಪೈಪ್ ಬದಲಾಯಿಸಿ ಅಥವಾ ವೆಲ್ಡಿಂಗ್ ಮಾಡಿ ಸೋರಿಕೆ ತಡೆಯಲಾಗುತ್ತದೆ.' : 'Technical crew excavates the joint, replaces rusted or ruptured pipes, clamps connections, and seals the line.'
        },
        {
          title: language === 'kn' ? 'ಒತ್ತಡ ಪರೀಕ್ಷೆ' : 'Pressure Testing',
          detail: language === 'kn' ? 'ಮತ್ತೆ ನೀರು ಹರಿಸಿ ಸೋರಿಕೆಯಿಲ್ಲದಿರುವುದನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಲಾಗುತ್ತದೆ.' : 'Water supply is gradually reintroduced to confirm zero leakage under municipal distribution pressure.'
        },
        {
          title: language === 'kn' ? 'ಜಿಯೋಟ್ಯಾಗ್ ಮುಕ್ತಾಯ' : 'Public Redressal Sign-off',
          detail: language === 'kn' ? 'ಸ್ಥಳದ ಜಿಪಿಎಸ್ ಫೋಟೋದೊಂದಿಗೆ ದೂರು ಮುಕ್ತಾಯ ದಾಖಲಿಸಲಾಗುತ್ತದೆ.' : 'GPS geotagged resolution proof is submitted and archived in the permanent civic audit ledger.'
        }
      ]
    },
    {
      id: 'sla_escalation',
      category: language === 'kn' ? 'ವ್ಯವಸ್ಥೆಯ ಆಡಳಿತ' : 'System Governance',
      icon: AlertTriangle,
      color: '#dc2626',
      question: language === 'kn' ? 'ಎಸ್.ಎಲ್.ಎ ಕಾಲಮಿತಿ ಮೀರಿದರೆ ಏನಾಗುತ್ತದೆ?' : 'What happens if a complaint exceeds its target SLA hours?',
      sla: language === 'kn' ? 'ಸ್ವಯಂಚಾಲಿತ ತಕ್ಷಣದ ಎಸ್ಕಲೇಶನ್' : 'Immediate Automated Escalation',
      department: language === 'kn' ? 'ಪಾಲಿಕೆ ಮೇಲ್ವಿಚಾರಣಾ ನಿರ್ದೇಶನಾಲಯ ಮತ್ತು ವಾರ್ಡ್ ಕಾರ್ಪೊರೇಟರ್‌ಗಳು' : 'MCC Oversight Directorate & Ward Corporators',
      summary: language === 'kn'
        ? 'ವ್ಯವಸ್ಥೆಯು ೨೪ಗಂ / ೭೨ಗಂ / ೧೬೮ಗಂ ಕಾಲಮಿತಿಯನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಟ್ರ್ಯಾಕ್ ಮಾಡುತ್ತದೆ.'
        : 'The system strictly tracks elapsed hours against the 24h / 72h / 168h target SLAs. Breached tickets are automatically flagged.',
      steps: [
        {
          title: language === 'kn' ? 'ಓವರ್‌ಡ್ಯೂ ಸ್ಥಿತಿ' : 'Automated Status Change',
          detail: language === 'kn' ? 'ಗಡುವು ಮುಗಿದ ತಕ್ಷಣ ಕೆಂಪು ಬ್ಯಾಡ್ಜ್‌ನೊಂದಿಗೆ OVERDUE ಎಂದು ಬದಲಾಗುತ್ತದೆ.' : 'When the timer expires without resolution, the ticket status shifts automatically to OVERDUE with a red alert badge.'
        },
        {
          title: language === 'kn' ? 'ಕಾರ್ಪೊರೇಟರ್ ಎಚ್ಚರಿಕೆ' : 'Corporator & Executive Alert',
          detail: language === 'kn' ? 'ಸಂಬಂಧಪಟ್ಟ ವಾರ್ಡ್ ಕಾರ್ಪೊರೇಟರ್ ಮತ್ತು ಕಾರ್ಯಪಾಲಕ ಎಂಜಿನಿಯರ್‌ಗೆ ಎಚ್ಚರಿಕೆಯ ಸಂದೇಶ ರವಾನೆ.' : 'An urgent escalation ping is logged to the elected Ward Corporator and senior zonal Executive Engineer.'
        },
        {
          title: language === 'kn' ? 'ವಾರ್ಡ್ ಅಂಕ ಕಡಿತ' : 'Ward Health Score Penalty',
          detail: language === 'kn' ? 'ಪ್ರತಿ ವಿಳಂಬಿತ ದೂರಿಗೆ ವಾರ್ಡ್‌ನ ಸಿವಿಕ್ ಹೆಲ್ತ್ ಸ್ಕೋರ್‌ನಿಂದ ೫ ಅಂಕ ಕಡಿತಗೊಳ್ಳುತ್ತದೆ.' : 'Each overdue complaint deducts 5 points from the Ward Civic Health Score, affecting municipal ward rankings.'
        },
        {
          title: language === 'kn' ? 'ತುರ್ತು ಮರುನಿಯೋಜನೆ' : 'Priority Re-dispatch',
          detail: language === 'kn' ? 'ಪರಿಹಾರವಾಗುವವರೆಗೆ ಅಧಿಕಾರಿಯ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ಅತ್ಯುನ್ನತ ಸ್ಥಾನಕ್ಕೆ ಬರುತ್ತದೆ.' : 'The complaint moves to the top of the Field Officer dispatch board until verification proof is submitted.'
        }
      ]
    },
    {
      id: 'reopening',
      category: language === 'kn' ? 'ನಾಗರಿಕ ಹಕ್ಕುಗಳು' : 'Citizen Rights',
      icon: ShieldCheck,
      color: '#4b5e28',
      question: language === 'kn' ? 'ಕಾಮಗಾರಿ ಅತೃಪ್ತಿಕರವಾಗಿದ್ದರೆ ದೂರನ್ನು ಪುನಃ ತೆರೆಯಬಹುದೇ?' : 'Can a complaint be reopened if the repair was unsatisfactory?',
      sla: language === 'kn' ? 'ಪರಿಹಾರವಾದ ೭ ದಿನಗಳೊಳಗೆ' : 'Within 7 Days of Resolution',
      department: language === 'kn' ? 'ಪಾಲಿಕೆ ನಾಗರಿಕ ಕುಂದುಕೊರತೆ ಕೋಶ' : 'MCC Citizen Grievance Cell',
      summary: language === 'kn'
        ? 'ನಾಗರಿಕರಿಗೆ ಸಂಪೂರ್ಣ ಮೇಲ್ವಿಚಾರಣಾ ಹಕ್ಕಿದೆ. ರಸ್ತೆ ಅಥವಾ ಕಸ ಸರಿಯಾಗಿ ವಿಲೇವಾರಿಯಾಗದಿದ್ದರೆ ಮರುಪರಿಶೀಲನೆ ಕೋರಬಹುದು.'
        : 'Citizens have full oversight. If a pothole was shoddily patched or garbage was only partially cleared, you can request an escalation.',
      steps: [
        {
          title: language === 'kn' ? 'ಫೋಟೋ ಪರಿಶೀಲಿಸಿ' : 'Inspect Resolution Photo',
          detail: language === 'kn' ? 'ಟ್ರ್ಯಾಕ್ ಪೇಜ್‌ನಲ್ಲಿ ಮೂಲ ಮತ್ತು ಪರಿಹಾರ ಫೋಟೋಗಳನ್ನು ಪಕ್ಕಪಕ್ಕದಲ್ಲಿ ವೀಕ್ಷಿಸಿ.' : 'Navigate to "Track Issue", enter your Complaint ID, and view the side-by-side original and resolution photographs.'
        },
        {
          title: language === 'kn' ? '೧-ಸ್ಟಾರ್ ರೇಟಿಂಗ್ ನೀಡಿ' : 'Submit 1-Star Rating',
          detail: language === 'kn' ? 'ಕಡಿಮೆ ರೇಟಿಂಗ್ ನೀಡಿ ಕಾಮಗಾರಿ ಅಪೂರ್ಣವಾಗಿರುವ ಬಗ್ಗೆ ಕಾರಣ ಬರೆಯಿರಿ.' : 'Leave a low satisfaction rating and write specific feedback explaining why the issue is still unresolved.'
        },
        {
          title: language === 'kn' ? 'ಅಡ್ಮಿನ್ ಮರುಪರಿಶೀಲನೆ' : 'Admin Verification Rejection',
          detail: language === 'kn' ? 'ಪಾಲಿಕೆ ಅಡ್ಮಿನ್ ದೂರನ್ನು REOPENED ಎಂದು ಬದಲಾಯಿಸಿ ಸರಿಪಡಿಸಲು ಸೂಚಿಸುತ್ತಾರೆ.' : 'MCC Central Admin inspects rejected proofs and transitions the state back to REOPENED with corrective instructions.'
        },
        {
          title: language === 'kn' ? 'ಮೇಲ್ವಿಚಾರಿತ ಮರುಕಾಮಗಾರಿ' : 'Supervised Re-work',
          detail: language === 'kn' ? 'ಮೇಲಧಿಕಾರಿಗಳ ನೇರ ನಿಗಾದಲ್ಲಿ ಕಾಮಗಾರಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲಾಗುತ್ತದೆ.' : 'Field officer is re-dispatched under supervisor notice to finish the repair to municipal compliance standards.'
        }
      ]
    }
  ];

  const toggleItem = (id) => {
    setOpenItem(prev => prev === id ? null : id);
  };

  return (
    <div style={{ marginTop: '45px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#4b5e28',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '4px'
          }}>
            <HelpCircle size={15} color="#4b5e28" /> {language === 'kn' ? 'ನಾಗರಿಕ ಜ್ಞಾನ ಕೇಂದ್ರ' : 'Civic Knowledge Base'}
          </div>
          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1f241a', margin: 0 }}>
            FAQ's
          </h3>
        </div>

        {/* Helpline Mini Badge */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #e5dcbe',
          borderRadius: '10px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(75, 94, 40, 0.06)'
        }}>
          <PhoneCall size={18} color="#4b5e28" />
          <div>
            <div style={{ fontSize: '0.72rem', color: '#5e6654', fontWeight: 700 }}>
              {language === 'kn' ? 'ಟೋಲ್-ಫ್ರೀ ಸಹಾಯವಾಣಿ' : 'Toll-Free Helpline'}
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#b38328' }}>0821-2440890</div>
          </div>
        </div>
      </div>

      {/* Accordion Container in Royal Light Gold & Olive Accents */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {faqItems.map((item) => {
          const isOpen = openItem === item.id;
          const Icon = item.icon;

          return (
            <div 
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                border: isOpen ? '1.5px solid #4b5e28' : '1.5px solid #e5dcbe',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: isOpen ? '0 4px 14px rgba(75, 94, 40, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              {/* Question Header Button */}
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  backgroundColor: isOpen ? '#f6f0e2' : '#ffffff',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: isOpen ? item.color : '#f5efe0',
                    color: isOpen ? '#ffffff' : item.color,
                    border: `1.5px solid ${isOpen ? item.color : '#e2d7be'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: item.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '2px'
                    }}>
                      {item.category} • SLA: {item.sla}
                    </div>
                    <div style={{
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: isOpen ? '#36481e' : '#1f241a'
                    }}>
                      {item.question}
                    </div>
                  </div>
                </div>

                <div style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.25s ease',
                  color: isOpen ? '#4b5e28' : '#7e8774',
                  flexShrink: 0
                }}>
                  <ChevronDown size={20} />
                </div>
              </button>

              {/* Accordion Expandable Body in Royal Light Gold & Olive */}
              {isOpen && (
                <div style={{
                  padding: '20px 22px',
                  borderTop: '1.5px solid #e8dfc9',
                  backgroundColor: '#fcfaf4'
                }}>
                  {/* Summary & SLA callout */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '20px',
                    border: '1.5px solid #e5dcbe',
                    borderLeft: `4px solid ${item.color}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}>
                    <div style={{ flex: '1', minWidth: '240px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#5e6654', textTransform: 'uppercase' }}>
                        {language === 'kn' ? 'ಜವಾಬ್ದಾರಿಯುತ ಪಾಲಿಕೆ ವಿಭಾಗ' : 'Responsible MCC Division'}
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1f241a', marginTop: '2px' }}>
                        {item.department}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#4a5040', marginTop: '6px', lineHeight: 1.5, margin: 0 }}>
                        {item.summary}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      backgroundColor: '#f6f0e2',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2d7be',
                      alignSelf: 'center'
                    }}>
                      <Clock size={18} color={item.color} />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#5e6654', fontWeight: 700 }}>
                          {language === 'kn' ? 'ಮಾನದಂಡ ಎಸ್.ಎಲ್.ಎ ಕಾಲಮಿತಿ' : 'Standard SLA Window'}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#b38328' }}>{item.sla}</div>
                      </div>
                    </div>
                  </div>

                  {/* 4-Step Resolution Process Timeline */}
                  <div>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#4b5e28',
                      marginBottom: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {language === 'kn' ? 'ಸಂಪೂರ್ಣ ಪರಿಹಾರ ಹಂತಗಳ ಪ್ರಕ್ರಿಯೆ:' : 'End-to-End Resolution Process:'}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px'
                    }}>
                      {item.steps.map((st, idx) => (
                        <div 
                          key={idx}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            padding: '14px',
                            border: '1.5px solid #e5dcbe',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px'
                          }}>
                            <span style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: item.color,
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1f241a' }}>
                              {st.title}
                            </span>
                          </div>
                          <p style={{
                            fontSize: '0.78rem',
                            color: '#555d4d',
                            lineHeight: 1.45,
                            margin: 0
                          }}>
                            {st.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
