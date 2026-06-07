FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG DATABASE_URL
RUN npx prisma generate
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/server.js"]
