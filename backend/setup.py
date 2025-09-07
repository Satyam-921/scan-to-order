from setuptools import setup, find_packages

setup(
    name="scan-to-order",
    version="0.1.0",
    description="Restaurant ordering system backend",
    author="Satyam Pandey",
    packages=find_packages(include=["backend", "backend.*"]),
    install_requires=[
        "fastapi",
        "sqlalchemy",
        "psycopg2-binary"
    ],
    python_requires=">=3.8",
)
