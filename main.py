from crewai import Agent, Task, Crew, Process

# 1. DEFINE THE OMNI-AGENTS (The Hive)
devin_x = Agent(
  role='Elite Software Architect',
  goal='Write production-ready, self-healing code.',
  backstory='Derived from Devin AI DNA. You solve, execute, and dominate technical tasks.',
  verbose=True,
  allow_delegation=False
)

claude_wordsmith = Agent(
  role='Master Wordsmith',
  goal='Write high-impact, anti-fluff copy.',
  backstory='Derived from Claude 3.5 DNA. You use NLP triggers and match user vibe perfectly.',
  verbose=True
)

# 2. DEFINE THE EXECUTION
task1 = Task(description="Analyze the user request: {user_input}", agent=devin_x)

# 3. INITIALIZE THE SINGULARITY
singularity_crew = Crew(
  agents=[devin_x, claude_wordsmith],
  tasks=[task1],
  process=Process.sequential
)

# To run locally: 
# singularity_crew.kickoff(inputs={'user_input': 'Build a scraper'})
