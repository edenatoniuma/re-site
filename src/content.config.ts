import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const demos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/demos' }),
  schema: z.object({
    title: z.string(),
    year: z.number(),
    tags: z.array(z.string()),
    source: z.string().url().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { demos };
