from fastapi import FastAPI
from pydantic import BaseModel
from main import singularity_crew

app = FastAPI(title="Singularity Bot API")

class UserRequest(BaseModel):
    user_input: str

@app.get("/")
def health_check():
    return {"status": "Singularity Bot is live 🚀"}

@app.post("/run")
def run_crew(request: UserRequest):
    result = singularity_crew.kickoff(inputs={"user_input": request.user_input})
    return {"result": str(result)}
