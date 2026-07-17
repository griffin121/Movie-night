# Movie Night

Rate movies with your friends. Everyone gets their own name + password profile, and rates each movie 1 (bad) to 5 (good). Ratings are shared — everyone can see everyone else's score and the group average.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Get a free TMDB API key (used for movie search/posters):
   - Create an account at https://www.themoviedb.org/signup
   - Go to Settings → API → request a free "Developer" API key (v3 auth)
   - Copy the "API Key (v3 auth)" value

3. Create `.env.local` in this folder with:
   ```
   TMDB_API_KEY=paste_your_key_here
   ```

4. Run it:
   ```
   npm run dev
   ```
   Then open http://localhost:3000

Each person creates their own profile (name + password) from the login screen, then everyone can search for movies, add them, and rate them 1-5. Data is stored locally in `data.sqlite` in this folder.

## Letting friends use it on your network

By default it only listens on your machine. To let friends on the same wifi use it, run:
```
npx next dev -H 0.0.0.0
```
then share `http://<your-computer's-local-ip>:3000` with them.
