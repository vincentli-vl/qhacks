# Install: pip install backboard-sdk
import asyncio
from backboard import BackboardClient

async def main():
    # Initialize the Backboard client
    client = BackboardClient(api_key="espr_Wkn-NkeHfZJAKAzShogN-sCSc_O5E2UWfJZfG2lKzLQ")

    # Create an assistant
    assistant = await client.create_assistant(
        name="My First Assistant",
        system_prompt="A helpful assistant"
    )

    # Create a thread
    thread = await client.create_thread(assistant.assistant_id)

    # Send a message and get the complete response
    response = await client.add_message(
        thread_id=thread.thread_id,
        content="Hello! Tell me a fun fact about space.",
        llm_provider="openai",
        model_name="gpt-4o",
        stream=False
    )

    # Print the AI's response
    print(response.content)

if __name__ == "__main__":
    asyncio.run(main())