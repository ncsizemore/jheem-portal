export default function CustomPage() {
    // Placeholder URL - to be replaced with the actual deployed Shiny app URL
    const shinyAppUrl = "https://youraccount.shinyapps.io/your-app-name/?initial_tab=custom";

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Custom Simulations</h1>
            <p className="mb-4">
                Displaying Custom Simulations from the JHEEM Interactive application.
            </p>
            <div style={{ width: '100%', height: '800px', border: '1px solid #ccc' }}>
                <iframe
                    src={shinyAppUrl}
                    title="Custom Simulations - JHEEM Interactive"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            </div>
        </div>
    );
}