import Home from './views/Home.svelte';
import InitConfig from './components/config/creation/Creation.svelte';
import Dashboard from './views/dashboard/Dashboard.svelte';

const routes = {
	'/': Home,

	'/init-config': InitConfig,

	'/dashboard': Dashboard,
};

export { routes };
