/** Public-folder URL that works both in dev (/) and on GitHub Pages (/portfoliov1/). */
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '')
