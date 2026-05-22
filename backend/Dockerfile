FROM python:3.13-slim
WORKDIR /app/backend

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./
ENV FLASK_APP=app.py
EXPOSE 5000

CMD ["python", "app.py"]