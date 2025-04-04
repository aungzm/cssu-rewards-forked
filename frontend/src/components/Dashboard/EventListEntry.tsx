

function EventListEntry(props: { event: any }) {

    const { event } = props;


    return (<div className="flex flex-row bg-white border-t border-gray-300 py-2 justify-between items-center hover:bg-gray-200">
        {/* <div></div> */}
        <div className="flex flex-col"> 
            <p> {event.name}</p>
            {/* <p className="text-gray-500"> {event.startTime.slice(11, 19)} to {event.endTime.slice(11, 19)}: {event.location} </p> Given a Time "2000-01-01T00:00:00.000Z", extract time */}
            <p className="text-gray-500"> {event.startTime.slice(11, 19)} on {event.endTime.slice(0, 10)} at {event.location} </p>
        </div>

        {/* <p className="text-gray-500 font-medium"> {event.numGuests} / {event.capacity} attending </p> */}
        <button className="bg-[#0063C6] text-white text-sm border border-[#0063C6] rounded-sm px-2 py-2 hover:bg-blue-500 text-blue-500 hover:underline"> View Details </button>
        

        

    </div>);

}

export default EventListEntry;