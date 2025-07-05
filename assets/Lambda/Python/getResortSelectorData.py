import json
import boto3
from boto3.dynamodb.conditions import Key

# Country to continent mapping
COUNTRY_TO_CONTINENT = {
    # North America
    "United States": "North America",
    "Canada": "North America",
    "Mexico": "North America",
    # Europe
    "Austria": "Europe",
    "Switzerland": "Europe",
    "France": "Europe",
    "Italy": "Europe",
    "Germany": "Europe",
    "Spain": "Europe",
    "Andorra": "Europe",
    "Norway": "Europe",
    "Sweden": "Europe",
    "Finland": "Europe",
    "United Kingdom": "Europe",
    "Slovakia": "Europe",
    "Slovenia": "Europe",
    "Czech Republic": "Europe",
    "Poland": "Europe",
    # Asia
    "Japan": "Asia",
    "China": "Asia",
    "South Korea": "Asia",
    "India": "Asia",
    # Oceania
    "Australia": "Oceania",
    "New Zealand": "Oceania",
    # South America
    "Argentina": "South America",
    "Chile": "South America",
    # Africa
    "South Africa": "Africa",
    "Morocco": "Africa",
    # Default
    "unknown": "Other"
}

def lambda_handler(event, context):
    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('SkiResorts')
    
    # Parse query parameters if any
    query_params = event.get('queryStringParameters', {}) or {}
    country = query_params.get('country')
    province = query_params.get('province')
    
    try:
        # Handle different API endpoints
        path = event.get('path', '')
        if path.endswith('/countries'):
            return get_countries(table)
        elif path.endswith('/states') or path.endswith('/provinces'):
            return get_provinces(table, country)
        elif path.endswith('/resorts'):
            if province:
                return get_resorts_by_province(table, province)
            elif country:
                return get_resorts_by_country(table, country)
            else:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'Missing country or province parameter'}),
                    'headers': get_cors_headers()
                }
        else:
            # Default: return all data in a structured format
            return get_all_resort_data(table)
            
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': get_cors_headers()
        }

def get_countries(table, continent=None):
    """Return all countries"""
    try:
        # Scan the table to get all countries
        response = table.scan(
            ProjectionExpression="country",
        )
        
        # Extract unique countries
        countries = set()
        for item in response.get('Items', []):
            country = item.get('country')
            if country and country != 'unknown':
                countries.add(country)
        
        # Paginate through results if necessary
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                ProjectionExpression="country",
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            for item in response.get('Items', []):
                country = item.get('country')
                if country and country != 'unknown':
                    countries.add(country)
        
        # Format response
        country_list = []
        for country in sorted(countries):
            country_list.append({
                'id': country,
                'name': country
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'countries': country_list
            }),
            'headers': get_cors_headers()
        }
    
    except Exception as e:
        print(f"Error getting countries: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': get_cors_headers()
        }

def get_provinces(table, country):
    """Return provinces/states for a specific country"""
    if not country:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Country parameter is required'}),
            'headers': get_cors_headers()
        }
    
    try:
        # Use a Global Secondary Index if available, otherwise scan with filter
        response = table.scan(
            FilterExpression=Key('country').eq(country),
            ProjectionExpression="province"
        )
        
        # Extract unique provinces
        provinces = set()
        for item in response.get('Items', []):
            province = item.get('province')
            if province and province != 'unknown':
                provinces.add(province)
        
        # Paginate through results if necessary
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression=Key('country').eq(country),
                ProjectionExpression="province",
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            for item in response.get('Items', []):
                province = item.get('province')
                if province and province != 'unknown':
                    provinces.add(province)
        
        # Format response
        province_list = []
        for province in sorted(provinces):
            province_list.append({
                'id': province,
                'name': province
            })
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'states': province_list
            }),
            'headers': get_cors_headers()
        }
    
    except Exception as e:
        print(f"Error getting provinces: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': get_cors_headers()
        }

def get_resorts_by_province(table, province):
    """Return resorts for a specific province/state"""
    if not province:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Province parameter is required'}),
            'headers': get_cors_headers()
        }
    
    try:
        # Use a Global Secondary Index if available, otherwise scan with filter
        response = table.scan(
            FilterExpression=Key('province').eq(province),
            ProjectionExpression="resortId, resortName, detailedDataS3Key"
        )
        
        # Extract resort data
        resorts = []
        for item in response.get('Items', []):
            resort_id = item.get('resortId')
            resort_name = item.get('resortName')
            s3_key = item.get('detailedDataS3Key')
            
            if resort_id and resort_name:
                resort = {
                    'id': resort_id,
                    'name': resort_name,
                    'hasMap': bool(s3_key)
                }
                
                if s3_key:
                    resort['thumbnailUrl'] = f"https://winter-sports-geojson.s3.amazonaws.com/thumbnails/{resort_id}.jpg"
                    resort['mapUrl'] = f"/resort/{resort_id}"
                
                resorts.append(resort)
        
        # Paginate through results if necessary
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression=Key('province').eq(province),
                ProjectionExpression="resortId, resortName, detailedDataS3Key",
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            for item in response.get('Items', []):
                resort_id = item.get('resortId')
                resort_name = item.get('resortName')
                s3_key = item.get('detailedDataS3Key')
                
                if resort_id and resort_name:
                    resort = {
                        'id': resort_id,
                        'name': resort_name,
                        'hasMap': bool(s3_key)
                    }
                    
                    if s3_key:
                        resort['thumbnailUrl'] = f"https://winter-sports-geojson.s3.amazonaws.com/thumbnails/{resort_id}.jpg"
                        resort['mapUrl'] = f"/resort/{resort_id}"
                    
                    resorts.append(resort)
        
        # Sort resorts by name
        resorts.sort(key=lambda x: x['name'])
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'resorts': resorts
            }),
            'headers': get_cors_headers()
        }
    
    except Exception as e:
        print(f"Error getting resorts by province: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': get_cors_headers()
        }

def get_resorts_by_country(table, country):
    """Return resorts for a specific country (when no provinces exist)"""
    if not country:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Country parameter is required'}),
            'headers': get_cors_headers()
        }
    
    try:
        # Use a Global Secondary Index if available, otherwise scan with filter
        response = table.scan(
            FilterExpression=Key('country').eq(country),
            ProjectionExpression="resortId, resortName, province, detailedDataS3Key"
        )
        
        # Extract resort data (only for "unknown" province)
        resorts = []
        for item in response.get('Items', []):
            province = item.get('province')
            
            # Only include resorts with unknown province
            if province == 'unknown':
                resort_id = item.get('resortId')
                resort_name = item.get('resortName')
                s3_key = item.get('detailedDataS3Key')
                
                if resort_id and resort_name:
                    resort = {
                        'id': resort_id,
                        'name': resort_name,
                        'hasMap': bool(s3_key)
                    }
                    
                    if s3_key:
                        resort['thumbnailUrl'] = f"https://winter-sports-geojson.s3.amazonaws.com/thumbnails/{resort_id}.jpg"
                        resort['mapUrl'] = f"/resort/{resort_id}"
                    
                    resorts.append(resort)
        
        # Paginate through results if necessary
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression=Key('country').eq(country),
                ProjectionExpression="resortId, resortName, province, detailedDataS3Key",
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            for item in response.get('Items', []):
                province = item.get('province')
                
                # Only include resorts with unknown province
                if province == 'unknown':
                    resort_id = item.get('resortId')
                    resort_name = item.get('resortName')
                    s3_key = item.get('detailedDataS3Key')
                    
                    if resort_id and resort_name:
                        resort = {
                            'id': resort_id,
                            'name': resort_name,
                            'hasMap': bool(s3_key)
                        }
                        
                        if s3_key:
                            resort['thumbnailUrl'] = f"https://winter-sports-geojson.s3.amazonaws.com/thumbnails/{resort_id}.jpg"
                            resort['mapUrl'] = f"/resort/{resort_id}"
                        
                        resorts.append(resort)
        
        # Sort resorts by name
        resorts.sort(key=lambda x: x['name'])
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'resorts': resorts
            }),
            'headers': get_cors_headers()
        }
    
    except Exception as e:
        print(f"Error getting resorts by country: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': get_cors_headers()
        }

def get_all_resort_data(table):
    """Get all resort data in a structured format"""
    try:
        # Scan the table to get all resort data
        response = table.scan()
        
        # Organize data by continent, country, province, resort
        structured_data = {}
        
        for item in response.get('Items', []):
            country = item.get('country', 'unknown')
            province = item.get('province', 'unknown')
            resort_id = item.get('resortId')
            resort_name = item.get('resortName')
            
            # Determine continent from country
            continent = COUNTRY_TO_CONTINENT.get(country, 'Other')
            
            # Create nested structure
            if continent not in structured_data:
                structured_data[continent] = {}
            if country not in structured_data[continent]:
                structured_data[continent][country] = {}
            if province not in structured_data[continent][country]:
                structured_data[continent][country][province] = []
            
            # Add resort to the structure
            structured_data[continent][country][province].append({
                'id': resort_id,
                'name': resort_name
            })
        
        # Paginate through results if necessary
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            
            for item in response.get('Items', []):
                country = item.get('country', 'unknown')
                province = item.get('province', 'unknown')
                resort_id = item.get('resortId')
                resort_name = item.get('resortName')
                
                # Determine continent from country
                continent = COUNTRY_TO_CONTINENT.get(country, 'Other')
                
                # Create nested structure
                if continent not in structured_data:
                    structured_data[continent] = {}
                if country not in structured_data[continent]:
                    structured_data[continent][country] = {}
                if province not in structured_data[continent][country]:
                    structured_data[continent][country][province] = []
                
                # Add resort to the structure
                structured_data[continent][country][province].append({
                    'id': resort_id,
                    'name': resort_name
                })
        
        return {
            'statusCode': 200,
            'body': json.dumps(structured_data),
            'headers': get_cors_headers()
        }
    
    except Exception as e:
        print(f"Error getting all resort data: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'headers': get_cors_headers()
        }

def get_cors_headers():
    """Return headers for CORS support"""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
    } 