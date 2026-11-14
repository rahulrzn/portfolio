import { handlePagesRequest } from '../server/pages';
import type { PagesContext } from '../server/types';

export const onRequest = (context: PagesContext): Promise<Response> => handlePagesRequest(context);
