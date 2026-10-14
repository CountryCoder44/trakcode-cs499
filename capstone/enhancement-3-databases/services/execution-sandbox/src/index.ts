import { createApp } from './app';

const PORT = Number(process.env.PORT ?? 4100);

const app = createApp();
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🧪 Execution sandbox listening on :${PORT}`);
});
