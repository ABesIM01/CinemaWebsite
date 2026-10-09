import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import catalog from './catalog.json' with { type: 'json' };
import { createTicketHandler } from './handler.mjs';

Deno.serve(createTicketHandler({
  env: (name: string) => Deno.env.get(name),
  createClient,
  catalog,
}));
