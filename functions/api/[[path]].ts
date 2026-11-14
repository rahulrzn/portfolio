import { handleApi } from '../../server/api';
import type { PagesContext } from '../../server/types';

export const onRequest = ({ request, env }: PagesContext): Promise<Response> => handleApi(request, env);
