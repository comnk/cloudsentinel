FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir \
    confluent-kafka==2.14.0 \
    kubernetes==36.0.2
COPY k8s-collector/ .
CMD ["python", "main.py"]
