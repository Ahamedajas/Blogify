import { Hono } from 'hono';
import { userRouter } from './Routes/user';
import { blogRouter } from './Routes/blog';
const app = new Hono();
app.route('/api/v1/user', userRouter);
app.route('/api/v1/blog', blogRouter);
export default app;
