FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir \
    confluent-kafka==2.14.0 \
    scikit-learn==1.6.1 \
    joblib==1.4.2 \
    numpy==2.4.4 \
    psycopg2-binary==2.9.10
RUN pip install --no-cache-dir \
    torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
COPY anomaly-service/ .
CMD ["python", "main.py"]
