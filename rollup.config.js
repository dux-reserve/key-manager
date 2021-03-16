import { config } from 'dotenv';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import css from 'rollup-plugin-css-only';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import livereload from 'rollup-plugin-livereload';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';

const isProduction = process.env.ROLLUP_WATCH ? false : process.env.NODE_ENV === 'development' ? false : true; // Production by default

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('yarn', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true,
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		},
	};
}

export default {
	input: 'app/src/svelte.ts',
	output: {
		sourcemap: !isProduction,
		format: 'iife',
		name: 'app',
		file: 'public/build/bundle.js',
	},
	plugins: [
		svelte({
			preprocess: sveltePreprocess(),
			compilerOptions: {
				// Enable run-time checks when not in production
				dev: !isProduction,
			},
		}),

		// We'll extract any component CSS out into
		// a separate file - better for performance
		css({ output: 'bundle.css' }),

		copy({
			targets: [{ src: 'app/src/fonts/*', dest: 'public/build/fonts' }],
			verbose: !isProduction,
		}),

		resolve({
			browser: true,
			dedupe: ['svelte'],
		}),

		commonjs(),

		typescript({
			sourceMap: !isProduction,
			inlineSources: !isProduction,
		}),

		// Inject process.env environment variables from the .env file
		injectProcessEnv({
			...config().parsed,
		}),

		// In dev mode, call `yarn run start` once
		// the bundle has been generated
		!isProduction && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!isProduction && livereload('public'),

		// If we're building for production (yarn run build
		// instead of yarn run dev), minify
		isProduction && terser(),
	],
	watch: {
		clearScreen: false,
	},
};
