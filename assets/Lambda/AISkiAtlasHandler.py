import json
import boto3
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Bedrock client
bedrock_runtime = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-1"  # Change to your AWS region
)

def lambda_handler(event, context):
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # Extract resort data from the request body
        # Check if we're coming from API Gateway or direct Lambda test
        if 'body' in event and isinstance(event['body'], str):
            # This is coming from API Gateway
            body = json.loads(event['body'])
        else:
            # This is a direct Lambda test or the body is already parsed
            body = event
            
        logger.info("Parsed body: %s", json.dumps(body))
        
        # Extract the resort information
        resort_data = body.get('resortData', {})
        resort_name = resort_data.get('name', 'the ski resort')
        
        # === NEW: Handle stylePrompt ===
        style_prompt = body.get('stylePrompt', '').strip()
        
        # Build the prompt using resort statistics
        prompt = build_prompt(resort_data, style_prompt)
        logger.info("Generated prompt: %s", prompt)
        
        # Call Bedrock with Nova model
        response = generate_description(prompt)
        logger.info("Final response content: %s", response)
        
        # Return the generated description
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'description': response
            })
        }
    except Exception as e:
        logger.error("Error: %s", str(e), exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }

def build_prompt(resort_data, style_prompt=None):
    """
    Build a detailed prompt for the AI model based on resort statistics
    """
    resort_name = resort_data.get('name', 'this ski resort')
    
    # Extract trail statistics
    trail_counts = resort_data.get('trailCounts', {})
    easy_trails = trail_counts.get('easy', 0)
    intermediate_trails = trail_counts.get('intermediate', 0)
    advanced_trails = trail_counts.get('advanced', 0)
    expert_trails = trail_counts.get('expert', 0)
    snow_park_trails = trail_counts.get('snowPark', 0)
    sled_trails = trail_counts.get('sled', 0)
    
    total_trails = easy_trails + intermediate_trails + advanced_trails + expert_trails + snow_park_trails + sled_trails
    
    # Extract area information
    total_area = resort_data.get('totalArea', 0)
    skiable_area = resort_data.get('skiableArea', 0)
    
    # Extract lift information
    lift_count = resort_data.get('liftCount', 0)
    lift_types = resort_data.get('liftTypes', {})
    lift_types_str = ", ".join([f"{count} {type.replace('_', ' ')}" for type, count in lift_types.items()])
    
    # Extract special features
    has_glades = resort_data.get('hasGlades', False)
    has_snowpark = resort_data.get('hasSnowpark', False)
    has_snowtubing = resort_data.get('hasSnowtubing', False)
    
    # Extract trail length information
    longest_trail = resort_data.get('longestTrail', 0)
    average_trail_length = resort_data.get('averageTrailLength', 0)
    
    # Extract contact information
    contact_info = resort_data.get('contactInfo', {})
    operator = contact_info.get('operator', '')
    location = contact_info.get('address', '')
    
    # Build the prompt
    prompt = f"""Write an informative, engaging description of {resort_name} ski resort that highlights its key features and what makes it special.

Resort Statistics:
- Total Area: {total_area} acres
- Skiable Area: {skiable_area} acres
- Total Trails: {total_trails}
  - Easy (Green): {easy_trails} trails
  - Intermediate (Blue): {intermediate_trails} trails
  - Advanced (Black): {advanced_trails} trails
  - Expert (Double Black): {expert_trails} trails
  - Terrain/Snow Parks: {snow_park_trails}
  - Sledding/Tubing Areas: {sled_trails}
- Longest Trail: {longest_trail} miles
- Average Trail Length: {average_trail_length} miles
- Total Lifts: {lift_count}
- Lift Types: {lift_types_str}
- Special Features: {', '.join(filter(None, [
    'Gladed terrain' if has_glades else '',
    'Terrain parks' if has_snowpark else '',
    'Snowtubing' if has_snowtubing else ''
]))}
"""
    
    if operator:
        prompt += f"- Operated by: {operator}\n"
    
    if location:
        prompt += f"- Located at: {location}\n"
    
    prompt += """
Please write approximately 150-200 words that include:
1. A brief overview of the resort
2. Description of the terrain variety and difficulty levels
3. Mention of any standout features (like gladed areas, terrain parks, etc.)
4. Who this resort is best suited for (beginners, experts, families, etc.)
"""
    if style_prompt:
        prompt += f"\n\n{style_prompt}"
    else:
        prompt += "\n\nKeep the tone informative and slightly promotional, but factual."
    
    return prompt

def generate_description(prompt):
    try:
        request_body = {
            "inferenceConfig": {
                "max_new_tokens": 300
            },
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        logger.info("Bedrock request body: %s", json.dumps(request_body))

        response = bedrock_runtime.invoke_model(
            modelId="amazon.nova-micro-v1:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )

        # Properly parse the response
        response_body = json.loads(response["body"].read())
        logger.info("Raw Bedrock response: %s", json.dumps(response_body))

        # Extract the response text from the correct response structure
        if "output" in response_body and "message" in response_body["output"]:
            message = response_body["output"]["message"]
            if "content" in message and len(message["content"]) > 0 and "text" in message["content"][0]:
                return message["content"][0]["text"].strip()

        logger.warning("No content in response. Returning fallback.")
        return "This ski resort offers a variety of terrain for all skill levels..."

    except Exception as e:
        logger.error(f"Error calling Bedrock: {str(e)}", exc_info=True)
        return "This ski resort offers a variety of terrain for all skill levels..."
