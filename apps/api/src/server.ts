import http from 'http';
import app from './app';

let server: http.Server | null = null;

export function start(port = process.env.PORT ? Number(process.env.PORT) : 4080) {
	return new Promise<void>((resolve, reject) => {
		if (server) return resolve();
		server = http.createServer(app);
		server.listen(port, () => {
			console.log(`Server listening on port ${port}`);
			resolve();
		});
		server.on('error', (err) => {
			reject(err);
		});
	});
}

export function stop() {
	return new Promise<void>((resolve, reject) => {
		if (!server) return resolve();
		server.close((err) => {
			if (err) return reject(err);
			server = null;
			resolve();
		});
	});
}

// If run directly, start the server and handle shutdown signals
if (require.main === module) {
	start().catch((err) => {
		console.error('Failed to start server', err);
		process.exit(1);
	});

	process.on('SIGINT', async () => {
		console.log('SIGINT received, shutting down');
		await stop();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		console.log('SIGTERM received, shutting down');
		await stop();
		process.exit(0);
	});
}
