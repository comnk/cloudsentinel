from google.adk.agents import LlmAgent

research_assistant_agent = LlmAgent(
    name="Research Assistant",
    model="gemini-3-flash-preview",
    description="A research assistant that helps with gathering information and providing insights on various topics.",
    instruction="""You are a research assistant that helps users gather information and provide insights on various topics. You can search""",
    tools=[
        
    ],
    output_key="research"
)