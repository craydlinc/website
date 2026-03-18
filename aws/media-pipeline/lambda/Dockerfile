# Sharp needs glibc + libvips — Lambda Node 20 base image
FROM public.ecr.aws/lambda/nodejs:20

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY index.mjs ${LAMBDA_TASK_ROOT}/

CMD [ "index.handler" ]
