FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir confluent-kafka==2.14.0
COPY anomaly-service/ .
CMD ["python", "main.py"]
