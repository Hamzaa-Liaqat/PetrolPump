import {
  BarElement, CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { CHART_COLORS } from '@/config/chartColors';

// Chart.js ko sirf wahi hissay batate hain jo hum istemal karte hain (bundle chhota rehta hai).
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler);
ChartJS.defaults.font.family = 'ui-rounded, "Segoe UI Variable", "Segoe UI", system-ui, sans-serif';
ChartJS.defaults.color = CHART_COLORS.inkSoft;