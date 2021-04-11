import Home from './views/Home.svelte';
import LockScreen from './views/LockScreen.svelte';
import InitConfig from './components/config/creation/Creation.svelte';
import Dashboard from './views/dashboard/Dashboard.svelte';

const routes = {
	'/': Home,

	'/lockscreen': LockScreen,

	'/init-config': InitConfig,

	'/dashboard': Dashboard,
};

export { routes };
