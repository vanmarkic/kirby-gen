"""
Quick test of the domain-mapping-test endpoint
"""
import requests
import json

description = """
I'm a musician playing gigs. I want to showcase both upcoming and past gigs with:
- Venue name and location
- Date/time
- Ticket links for upcoming gigs
- Photos and videos from performances

I also need:
- A bio/about section
- Discography with music samples
- Band members showcase

Gig details should include: Title, Venue name, Location, Date & time, Status (upcoming/past), Description, Ticket link, Photos gallery, and Videos.
"""

response = requests.post(
    'http://localhost:8001/skills/domain-mapping-test',
    json={
        'description': description.strip(),
        'profession': 'musician'
    }
)

print("Status Code:", response.status_code)
print("\nResponse:")
result = response.json()

if result['success']:
    print("✅ SUCCESS!")
    print(f"\nMetadata:")
    print(f"  - Duration: {result['metadata']['duration']:.2f}s")
    print(f"  - Entities: {result['metadata']['entities_count']}")
    print(f"  - Relationships: {result['metadata']['relationships_count']}")
    
    schema = result['data']['domainModel']
    print(f"\nEntities:")
    for entity in schema['entities']:
        print(f"  - {entity['name']} ({len(entity['fields'])} fields)")
    
    # Save to file
    with open('test-domain-model.json', 'w') as f:
        json.dump(schema, f, indent=2)
    print("\n✅ Saved domain model to test-domain-model.json")
else:
    print("❌ FAILED!")
    print(json.dumps(result['error'], indent=2))
